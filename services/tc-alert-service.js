/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-alert-service.js
 * Escalating alerts for TC blockers, approvals, and deadline-critical issues.
 */

function computeNextEscalation(severity, step) {
  const now = Date.now();
  if (severity === 'critical') {
    if (step <= 0) return new Date(now + 5 * 60 * 1000).toISOString();
    if (step === 1) return new Date(now + 10 * 60 * 1000).toISOString();
    return new Date(now + 30 * 60 * 1000).toISOString();
  }
  if (severity === 'urgent') {
    if (step <= 0) return new Date(now + 15 * 60 * 1000).toISOString();
    return new Date(now + 60 * 60 * 1000).toISOString();
  }
  if (severity === 'action_required') {
    return new Date(now + 4 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

function buildAlertMessage(alert) {
  const summary = alert.summary ? `\n${alert.summary}` : '';
  const next = alert.prepared_action?.label ? `\nPrepared next step: ${alert.prepared_action.label}` : '';
  return `${alert.title}${summary}${next}`.trim();
}

export function createTCAlertService({
  pool,
  coordinator,
  logger = console,
  sendSMS = null,
  sendAlertSms = null,
  sendAlertCall = null,
}) {
  let schedulerHandle = null;

  async function listAlerts({ transactionId = null, status = null, limit = 50 } = {}) {
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
      `SELECT * FROM tc_alerts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(next_escalation_at, created_at) ASC, severity DESC
       LIMIT $${values.length}`,
      values
    );
    return rows;
  }

  async function createAlert(transactionId, payload = {}) {
    const {
      severity = 'action_required',
      title,
      summary = null,
      status = 'open',
      assigned_to = null,
      target_type = null,
      target_id = null,
      escalation_step = 0,
      next_escalation_at = new Date().toISOString(),
      prepared_action = {},
      metadata = {},
    } = payload;
    const { rows } = await pool.query(
      `INSERT INTO tc_alerts (transaction_id, severity, title, summary, status, assigned_to, target_type, target_id, escalation_step, next_escalation_at, prepared_action, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [transactionId, severity, title, summary, status, assigned_to, target_type, target_id, escalation_step, next_escalation_at, JSON.stringify(prepared_action || {}), JSON.stringify(metadata || {})]
    );
    const row = rows[0];
    await coordinator.logEvent(transactionId, 'alert_created', { alert_id: row.id, severity: row.severity, target_type, target_id });
    return row;
  }

  async function getAlert(alertId) {
    const { rows } = await pool.query(`SELECT * FROM tc_alerts WHERE id=$1`, [alertId]);
    return rows[0] || null;
  }

  async function recordDelivery(alertId, channel, status, payload = {}) {
    await pool.query(
      `INSERT INTO tc_alert_deliveries (alert_id, channel, status, payload) VALUES ($1,$2,$3,$4)`,
      [alertId, channel, status, JSON.stringify(payload || {})]
    );
  }

  async function updateAlert(alertId, patch = {}) {
    const current = await getAlert(alertId);
    if (!current) return null;
    if (patch.action) return actOnAlert(alertId, patch);

    const fields = [];
    const values = [];
    const allowed = ['severity', 'title', 'summary', 'status', 'assigned_to', 'target_type', 'target_id', 'escalation_step', 'next_escalation_at', 'prepared_action', 'metadata', 'acknowledged_at', 'resolved_at'];
    for (const key of allowed) {
      if (key in patch) {
        values.push((key === 'prepared_action' || key === 'metadata') ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return current;
    values.push(alertId);
    const { rows } = await pool.query(
      `UPDATE tc_alerts SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async function actOnAlert(alertId, { action, actor = 'system', notes = null, snooze_until = null } = {}) {
    const current = await getAlert(alertId);
    if (!current) return null;
    const normalizedAction = String(action || '').toLowerCase();
    const metadata = { ...(current.metadata || {}), last_action_by: actor, last_action_notes: notes, last_action_at: new Date().toISOString() };

    if (normalizedAction === 'acknowledge') {
      const { rows } = await pool.query(
        `UPDATE tc_alerts SET status='acknowledged', acknowledged_at=NOW(), metadata=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [alertId, JSON.stringify(metadata)]
      );
      return rows[0] || null;
    }

    if (normalizedAction === 'resolve') {
      const { rows } = await pool.query(
        `UPDATE tc_alerts SET status='resolved', resolved_at=NOW(), acknowledged_at=COALESCE(acknowledged_at, NOW()), metadata=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [alertId, JSON.stringify(metadata)]
      );
      await coordinator.logEvent(current.transaction_id, 'alert_resolved', { alert_id: alertId, actor });
      return rows[0] || null;
    }

    if (normalizedAction === 'snooze') {
      const { rows } = await pool.query(
        `UPDATE tc_alerts SET status='snoozed', next_escalation_at=COALESCE($2, next_escalation_at), metadata=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [alertId, snooze_until, JSON.stringify(metadata)]
      );
      return rows[0] || null;
    }

    if (normalizedAction === 'reopen') {
      const nextAt = computeNextEscalation(current.severity, current.escalation_step) || new Date().toISOString();
      const { rows } = await pool.query(
        `UPDATE tc_alerts SET status='open', next_escalation_at=$2, metadata=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [alertId, nextAt, JSON.stringify(metadata)]
      );
      return rows[0] || null;
    }

    return current;
  }

  async function deliverAlert(alert) {
    const message = buildAlertMessage(alert);
    let result = { success: false, error: 'No delivery channel available' };
    let channel = 'none';

    if (alert.severity === 'critical' && alert.escalation_step >= 2 && sendAlertCall) {
      channel = 'call';
      result = await sendAlertCall(message);
    } else if ((alert.severity === 'urgent' || alert.severity === 'critical') && sendAlertSms) {
      channel = 'alert_sms';
      result = await sendAlertSms(message);
    } else if (sendSMS && alert.metadata?.phone) {
      channel = 'sms';
      result = await sendSMS(alert.metadata.phone, message);
    } else if (sendAlertSms) {
      channel = 'alert_sms';
      result = await sendAlertSms(message);
    }

    await recordDelivery(alert.id, channel, result?.success === false ? 'failed' : 'sent', result);

    const nextStep = (alert.escalation_step || 0) + 1;
    const nextAt = computeNextEscalation(alert.severity, nextStep);
    const nextStatus = alert.status === 'snoozed' ? 'snoozed' : 'open';
    const { rows } = await pool.query(
      `UPDATE tc_alerts SET escalation_step=$2, next_escalation_at=$3, status=$4, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [alert.id, nextStep, nextAt, nextStatus]
    );
    return rows[0] || alert;
  }

  async function processDueAlerts(limit = 25) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_alerts
       WHERE status IN ('open','snoozed')
         AND next_escalation_at IS NOT NULL
         AND next_escalation_at <= NOW()
       ORDER BY next_escalation_at ASC
       LIMIT $1`,
      [limit]
    );

    const processed = [];
    for (const alert of rows) {
      try {
        processed.push(await deliverAlert(alert));
      } catch (error) {
        logger.warn?.({ err: error.message, alertId: alert.id }, '[TC-ALERT] delivery failed');
        await recordDelivery(alert.id, 'error', 'failed', { error: error.message });
      }
    }
    return processed;
  }

  function startScheduler(intervalMs = 60 * 1000) {
    if (schedulerHandle) return schedulerHandle;
    schedulerHandle = setInterval(() => {
      processDueAlerts().catch((error) => logger.warn?.({ err: error.message }, '[TC-ALERT] scheduler error'));
    }, intervalMs);
    return schedulerHandle;
  }

  function stopScheduler() {
    if (!schedulerHandle) return;
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }

  return {
    listAlerts,
    createAlert,
    getAlert,
    updateAlert,
    actOnAlert,
    processDueAlerts,
    startScheduler,
    stopScheduler,
  };
}

export default createTCAlertService;
