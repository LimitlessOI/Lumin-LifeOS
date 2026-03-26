/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-portal-service.js
 * Agent/client portal read models plus communication and document-request tracking.
 */

import { createTCStatusEngine } from './tc-status-engine.js';

function toClientView(report, docRequests, communications) {
  return {
    transaction: {
      id: report.transaction.id,
      address: report.transaction.address,
      status: report.transaction.status,
      agent_role: report.transaction.agent_role,
    },
    status: {
      stage: report.stage,
      health_status: report.health_status,
      next_action: report.next_action,
      waiting_on: report.waiting_on,
      missing_doc_count: report.missing_doc_count,
      blocker_count: report.blocker_count,
      last_client_update_at: report.last_client_update_at,
      next_client_update_due_at: report.next_client_update_due_at,
      days_to_close: report.days_to_close,
      portal_sync_status: {
        skySlope: report.portal_sync_status?.skySlope,
      },
    },
    requested_documents: docRequests.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      due_at: item.due_at,
    })),
    recent_updates: communications
      .filter((item) => item.audience === 'client' || item.audience === 'agent')
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        channel: item.channel,
        subject: item.subject,
        status: item.status,
        sent_at: item.sent_at,
        created_at: item.created_at,
      })),
    recent_events: report.recentEvents.slice(0, 10).map((event) => ({
      event_type: event.event_type,
      created_at: event.created_at,
    })),
  };
}

export function createTCPortalService({ pool, coordinator, logger = console }) {
  const statusEngine = createTCStatusEngine();

  async function listApprovals(transactionId, { limit = 20, statuses = ['pending', 'awaiting_review', 'snoozed', 'approved'] } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_approval_items WHERE transaction_id=$1 AND status = ANY($2) ORDER BY COALESCE(due_at, created_at) ASC LIMIT $3`,
      [transactionId, statuses, limit]
    );
    return rows;
  }

  async function listAlerts(transactionId, { limit = 20, statuses = ['open', 'acknowledged', 'snoozed'] } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_alerts WHERE transaction_id=$1 AND status = ANY($2) ORDER BY COALESCE(next_escalation_at, created_at) ASC LIMIT $3`,
      [transactionId, statuses, limit]
    );
    return rows;
  }

  async function listInteractions(transactionId, { limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT id, interaction_type, contact_name, contact_role, channel, recording_mode, recording_allowed,
              status, started_at, ended_at, summary, next_actions, metadata
       FROM tc_interactions
       WHERE transaction_id=$1
       ORDER BY COALESCE(ended_at, started_at) DESC
       LIMIT $2`,
      [transactionId, limit]
    );
    return rows;
  }

  async function listDocumentRequests(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_document_requests WHERE transaction_id=$1 ORDER BY created_at DESC`,
      [transactionId]
    );
    return rows;
  }

  async function createDocumentRequest(transactionId, payload = {}) {
    const { title, description = null, requested_from = 'client', due_at = null, metadata = {} } = payload;
    const { rows } = await pool.query(
      `INSERT INTO tc_document_requests (transaction_id, title, description, requested_from, due_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [transactionId, title, description, requested_from, due_at, JSON.stringify(metadata || {})]
    );
    await coordinator.logEvent(transactionId, 'document_request_created', { title, requested_from, due_at });
    return rows[0];
  }

  async function updateDocumentRequest(requestId, patch = {}) {
    const fields = [];
    const values = [];
    const allowed = ['title', 'description', 'requested_from', 'status', 'due_at', 'metadata'];
    for (const key of allowed) {
      if (key in patch) {
        values.push(key === 'metadata' ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return null;
    values.push(requestId);
    const { rows } = await pool.query(
      `UPDATE tc_document_requests SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    const row = rows[0] || null;
    if (row) await coordinator.logEvent(row.transaction_id, 'document_request_updated', { request_id: row.id, status: row.status });
    return row;
  }

  async function listCommunications(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_communications WHERE transaction_id=$1 ORDER BY created_at DESC`,
      [transactionId]
    );
    return rows;
  }

  async function createCommunication(transactionId, payload = {}) {
    const {
      channel = 'email',
      audience = 'client',
      template_key = null,
      subject = null,
      body,
      status = 'draft',
      sent_at = null,
      metadata = {},
    } = payload;
    const { rows } = await pool.query(
      `INSERT INTO tc_communications (transaction_id, channel, audience, template_key, subject, body, status, sent_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [transactionId, channel, audience, template_key, subject, body, status, sent_at, JSON.stringify(metadata || {})]
    );
    const row = rows[0];
    await coordinator.logEvent(transactionId, 'communication_recorded', { communication_id: row.id, channel, audience, status });
    return row;
  }

  async function updateCommunication(communicationId, patch = {}) {
    const fields = [];
    const values = [];
    const allowed = ['channel', 'audience', 'template_key', 'subject', 'body', 'status', 'sent_at', 'metadata'];
    for (const key of allowed) {
      if (key in patch) {
        values.push(key === 'metadata' ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return null;
    values.push(communicationId);
    const { rows } = await pool.query(
      `UPDATE tc_communications SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    const row = rows[0] || null;
    if (row) await coordinator.logEvent(row.transaction_id, 'communication_updated', { communication_id: row.id, status: row.status, audience: row.audience });
    return row;
  }

  async function buildOverview(transactionId, { view = 'agent' } = {}) {
    const transaction = await coordinator.getTransaction(transactionId);
    if (!transaction) return null;
    const [events, docRequests, communications, approvals, alerts, interactions] = await Promise.all([
      coordinator.getTransactionEvents(transactionId, 50),
      listDocumentRequests(transactionId),
      listCommunications(transactionId),
      listApprovals(transactionId),
      listAlerts(transactionId),
      listInteractions(transactionId),
    ]);
    const derived = statusEngine.deriveTransactionState({ transaction, events });
    const report = { transaction, recentEvents: events.slice(0, 20), ...derived };

    if (view === 'client') return toClientView(report, docRequests, communications);

    return {
      transaction,
      status: derived,
      document_requests: docRequests,
      communications,
      approvals,
      alerts,
      interactions,
      recent_events: events.slice(0, 20),
    };
  }

  async function buildDashboardSlice(limit = 25) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_transactions WHERE status IN ('active','pending') ORDER BY close_date ASC NULLS LAST LIMIT $1`,
      [limit]
    );
    return Promise.all(rows.map(async (transaction) => {
      const [events, docRequests, approvals, alerts, interactions] = await Promise.all([
        coordinator.getTransactionEvents(transaction.id, 20),
        listDocumentRequests(transaction.id),
        listApprovals(transaction.id, { limit: 10 }),
        listAlerts(transaction.id, { limit: 10 }),
        listInteractions(transaction.id, { limit: 5 }),
      ]);
      const status = statusEngine.deriveTransactionState({ transaction, events });
      return {
        transaction_id: transaction.id,
        address: transaction.address,
        status: transaction.status,
        stage: status.stage,
        health_status: status.health_status,
        next_action: status.next_action,
        blocker_count: status.blocker_count,
        missing_doc_count: status.missing_doc_count,
        open_document_requests: docRequests.filter((item) => item.status === 'pending' || item.status === 'sent').length,
        open_approvals: approvals.length,
        open_alerts: alerts.length,
        recent_interactions: interactions.length,
      };
    }));
  }

  return {
    buildOverview,
    buildDashboardSlice,
    listInteractions,
    listDocumentRequests,
    createDocumentRequest,
    updateDocumentRequest,
    listApprovals,
    listAlerts,
    listCommunications,
    createCommunication,
    updateCommunication,
  };
}

export default createTCPortalService;
