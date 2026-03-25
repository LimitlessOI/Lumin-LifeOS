/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-approval-service.js
 * Approval cockpit state for review / approve / reject / snooze flows.
 */

export function createTCApprovalService({ pool, coordinator, automationService, logger = console }) {
  async function listApprovals({ transactionId = null, status = null, limit = 50 } = {}) {
    const where = [];
    const values = [];
    if (transactionId != null) {
      values.push(transactionId);
      where.push(`transaction_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    values.push(Math.min(Number(limit) || 50, 200));
    const { rows } = await pool.query(
      `SELECT * FROM tc_approval_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(due_at, created_at) ASC, priority DESC
       LIMIT $${values.length}`,
      values
    );
    return rows;
  }

  async function createApproval(transactionId, payload = {}) {
    const {
      category = 'task',
      title,
      summary = null,
      status = 'pending',
      priority = 'normal',
      due_at = null,
      target_type = null,
      target_id = null,
      prepared_action = {},
      metadata = {},
    } = payload;
    const { rows } = await pool.query(
      `INSERT INTO tc_approval_items (transaction_id, category, title, summary, status, priority, due_at, target_type, target_id, prepared_action, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [transactionId, category, title, summary, status, priority, due_at, target_type, target_id, JSON.stringify(prepared_action || {}), JSON.stringify(metadata || {})]
    );
    const row = rows[0];
    await coordinator.logEvent(transactionId, 'approval_created', {
      approval_id: row.id,
      category: row.category,
      priority: row.priority,
      target_type: row.target_type,
      target_id: row.target_id,
    });
    return row;
  }

  async function getApproval(id) {
    const { rows } = await pool.query(`SELECT * FROM tc_approval_items WHERE id=$1`, [id]);
    return rows[0] || null;
  }

  async function updateApproval(approvalId, patch = {}) {
    const current = await getApproval(approvalId);
    if (!current) return null;

    if (patch.action) {
      return actOnApproval(approvalId, patch);
    }

    const fields = [];
    const values = [];
    const allowed = ['title', 'summary', 'status', 'priority', 'due_at', 'prepared_action', 'metadata', 'resolved_at', 'acknowledged_at'];
    for (const key of allowed) {
      if (key in patch) {
        values.push((key === 'prepared_action' || key === 'metadata') ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return current;
    values.push(approvalId);
    const { rows } = await pool.query(
      `UPDATE tc_approval_items SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async function actOnApproval(approvalId, { action, actor = 'system', notes = null, snooze_until = null } = {}) {
    const current = await getApproval(approvalId);
    if (!current) return null;

    const normalizedAction = String(action || '').toLowerCase();
    const metadata = { ...(current.metadata || {}), last_action_by: actor, last_action_notes: notes, last_action_at: new Date().toISOString() };

    if (normalizedAction === 'acknowledge') {
      const { rows } = await pool.query(
        `UPDATE tc_approval_items SET status='awaiting_review', acknowledged_at=NOW(), metadata=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [approvalId, JSON.stringify(metadata)]
      );
      return rows[0] || null;
    }

    if (normalizedAction === 'snooze') {
      const { rows } = await pool.query(
        `UPDATE tc_approval_items SET status='snoozed', due_at=COALESCE($2, due_at), metadata=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [approvalId, snooze_until, JSON.stringify(metadata)]
      );
      return rows[0] || null;
    }

    if (normalizedAction === 'reject') {
      const { rows } = await pool.query(
        `UPDATE tc_approval_items SET status='rejected', acknowledged_at=COALESCE(acknowledged_at, NOW()), metadata=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [approvalId, JSON.stringify(metadata)]
      );
      await coordinator.logEvent(current.transaction_id, 'approval_rejected', { approval_id: approvalId, target_type: current.target_type, target_id: current.target_id, actor });
      return rows[0] || null;
    }

    if (normalizedAction !== 'approve') {
      return current;
    }

    let execution = { ok: true, skipped: true };
    const prepared = current.prepared_action || {};
    if (prepared.kind === 'send_communication' && prepared.communication_id) {
      execution = await automationService.sendCommunicationById(prepared.communication_id);
    } else if (prepared.kind === 'send_document_request' && prepared.request_id) {
      execution = await automationService.sendDocumentRequest(prepared.request_id, { channels: prepared.channels || ['email'], sendNow: true });
    } else if (prepared.kind === 'send_weekly_report' && prepared.report_id) {
      execution = await automationService.prepareWeeklyReportDelivery(prepared.report_id, {
        channels: prepared.channels || ['email'],
        sendNow: true,
        audience: prepared.audience || 'seller',
      });
    }

    const nextStatus = execution.ok ? 'completed' : 'approved';
    metadata.execution = execution;
    const { rows } = await pool.query(
      `UPDATE tc_approval_items
       SET status=$2,
           acknowledged_at=COALESCE(acknowledged_at, NOW()),
           resolved_at=CASE WHEN $2='completed' THEN NOW() ELSE resolved_at END,
           metadata=$3,
           updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [approvalId, nextStatus, JSON.stringify(metadata)]
    );
    const updated = rows[0] || null;
    await coordinator.logEvent(current.transaction_id, execution.ok ? 'approval_completed' : 'approval_approved', {
      approval_id: approvalId,
      target_type: current.target_type,
      target_id: current.target_id,
      actor,
      execution_ok: !!execution.ok,
    });
    return updated;
  }

  return {
    listApprovals,
    createApproval,
    getApproval,
    updateApproval,
    actOnApproval,
  };
}

export default createTCApprovalService;
