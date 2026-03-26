/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-asana-sync-service.js
 * Asana sync from canonical TC transaction state. Asana is the ops surface, not the source of truth.
 */

import { createTCWorkflowService } from './tc-workflow-service.js';

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toAsanaNotes({ transaction, status, document_requests = [], approvals = [], alerts = [], interactions = [], communications = [] }) {
  const lines = [
    `Address: ${transaction.address || 'Unknown'}`,
    `Stage: ${status.stage || 'unknown'}`,
    `Health: ${status.health_status || 'unknown'}`,
    `Next action: ${status.next_action || '—'}`,
    `Waiting on: ${status.waiting_on || '—'}`,
    `Missing docs: ${status.missing_doc_count || 0}`,
    `Blockers: ${status.blocker_count || 0}`,
    `Open approvals: ${approvals.length}`,
    `Open alerts: ${alerts.length}`,
    `Recent interactions: ${interactions.length}`,
    `Open communications: ${(communications || []).filter((item) => !['sent', 'delivered', 'replied', 'resolved'].includes(String(item.status || '').toLowerCase())).length}`,
    '',
    'Open document requests:',
    ...(document_requests.length ? document_requests.slice(0, 10).map((item) => `- ${item.title} [${item.status}]`) : ['- None']),
  ];
  return lines.join('\n');
}

function buildSubtaskSpecs(overview) {
  const items = [];

  for (const request of overview.document_requests || []) {
    if (['received', 'completed', 'resolved'].includes(String(request.status || '').toLowerCase())) continue;
    items.push({
      entity_type: 'task',
      local_entity_type: 'document_request',
      local_entity_id: String(request.id),
      name: `Document Request: ${request.title}`,
      notes: compactText(`${request.description || ''} Status: ${request.status || 'pending'}`),
      due_on: request.due_at ? String(request.due_at).slice(0, 10) : null,
    });
  }

  for (const approval of overview.approvals || []) {
    if (['completed', 'rejected'].includes(String(approval.status || '').toLowerCase())) continue;
    items.push({
      entity_type: 'task',
      local_entity_type: 'approval',
      local_entity_id: String(approval.id),
      name: `Approval: ${approval.title}`,
      notes: compactText(`${approval.summary || ''} Priority: ${approval.priority || 'normal'}`),
      due_on: approval.due_at ? String(approval.due_at).slice(0, 10) : null,
    });
  }

  for (const alert of overview.alerts || []) {
    if (String(alert.status || '').toLowerCase() === 'resolved') continue;
    items.push({
      entity_type: 'task',
      local_entity_type: 'alert',
      local_entity_id: String(alert.id),
      name: `Alert: ${alert.title}`,
      notes: compactText(`${alert.summary || ''} Severity: ${alert.severity || 'action_required'}`),
      due_on: alert.next_escalation_at ? String(alert.next_escalation_at).slice(0, 10) : null,
    });
  }

  for (const communication of overview.communications || []) {
    const status = String(communication.status || '').toLowerCase();
    if (['sent', 'delivered', 'replied', 'resolved'].includes(status)) continue;
    items.push({
      entity_type: 'task',
      local_entity_type: 'communication',
      local_entity_id: String(communication.id),
      name: `Communication: ${communication.subject || communication.template_key || communication.channel}`,
      notes: compactText(`${communication.audience || 'client'} via ${communication.channel || 'email'} — status: ${communication.status || 'draft'}`),
      due_on: null,
    });
  }

  for (const interaction of overview.interactions || []) {
    const status = String(interaction.status || '').toLowerCase();
    if (!['analyzed', 'open'].includes(status)) continue;
    items.push({
      entity_type: 'task',
      local_entity_type: 'interaction',
      local_entity_id: String(interaction.id),
      name: `Interaction review: ${interaction.contact_name || interaction.contact_role || interaction.interaction_type}`,
      notes: compactText(`${interaction.interaction_type} — ${interaction.summary || 'Review coaching notes and profile updates.'}`),
      due_on: interaction.started_at ? String(interaction.started_at).slice(0, 10) : null,
    });
  }

  return items.slice(0, 50);
}

export function createTCAsanaSyncService({ pool, coordinator, portalService, logger = console }) {
  const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
  const workflowService = createTCWorkflowService({ portalService, logger });

  function isConfigured() {
    return Boolean(process.env.ASANA_ACCESS_TOKEN && process.env.ASANA_TC_PROJECT_GID);
  }

  function getHeaders() {
    if (!isConfigured()) throw new Error('Asana not configured');
    return {
      Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async function asanaRequest(method, pathname, body = null) {
    const res = await fetch(`${ASANA_API_BASE}${pathname}`, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify({ data: body }) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.errors?.[0]?.message || `Asana request failed (${res.status})`);
    }
    return payload.data;
  }

  async function getExternalRef(localEntityType, localEntityId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_external_refs WHERE provider='asana' AND local_entity_type=$1 AND local_entity_id=$2 LIMIT 1`,
      [localEntityType, String(localEntityId)]
    );
    return rows[0] || null;
  }

  async function upsertExternalRef({ transactionId, entityType = 'task', localEntityType, localEntityId, externalId, externalUrl = null, metadata = {} }) {
    const { rows } = await pool.query(
      `INSERT INTO tc_external_refs (transaction_id, provider, entity_type, local_entity_type, local_entity_id, external_id, external_url, metadata)
       VALUES ($1,'asana',$2,$3,$4,$5,$6,$7)
       ON CONFLICT (provider, entity_type, local_entity_type, local_entity_id)
       DO UPDATE SET external_id=EXCLUDED.external_id, external_url=EXCLUDED.external_url, metadata=EXCLUDED.metadata, updated_at=NOW()
       RETURNING *`,
      [transactionId, entityType, localEntityType, String(localEntityId), String(externalId), externalUrl, JSON.stringify(metadata || {})]
    );
    return rows[0];
  }

  async function previewTransaction(transactionId) {
    const overview = await portalService.buildOverview(transactionId, { view: 'agent' });
    if (!overview) return null;
    const workflow = await workflowService.buildWorkflow(transactionId);
    const notes = toAsanaNotes(overview);
    const workflowTasks = (workflow?.workflow?.stages || []).flatMap((stage) =>
      stage.tasks
        .filter((task) => task.status !== 'completed')
        .map((task) => ({
          entity_type: 'task',
          local_entity_type: 'workflow_task',
          local_entity_id: `${workflow.workflow.key}:${stage.key}:${task.key}`,
          name: `Workflow: ${task.label}`,
          notes: compactText(`${stage.label} — status: ${task.status}`),
          due_on: overview.transaction.close_date ? String(overview.transaction.close_date).slice(0, 10) : null,
        }))
    );
    const subtasks = [...workflowTasks, ...buildSubtaskSpecs(overview)].slice(0, 75);
    return {
      transaction: overview.transaction,
      parentTask: {
        local_entity_type: 'transaction',
        local_entity_id: String(overview.transaction.id),
        name: `${overview.transaction.address} — ${overview.status.stage || 'transaction'}`,
        notes,
        due_on: overview.transaction.close_date ? String(overview.transaction.close_date).slice(0, 10) : null,
      },
      workflow: workflow?.workflow || null,
      subtasks,
    };
  }

  async function upsertTask({ transactionId, projectGid, parentGid = null, spec }) {
    const existing = await getExternalRef(spec.local_entity_type, spec.local_entity_id);
    const payload = {
      name: spec.name,
      notes: spec.notes || '',
      due_on: spec.due_on || undefined,
    };

    if (existing?.external_id) {
      const updated = await asanaRequest('PUT', `/tasks/${existing.external_id}`, payload);
      await upsertExternalRef({
        transactionId,
        entityType: 'task',
        localEntityType: spec.local_entity_type,
        localEntityId: spec.local_entity_id,
        externalId: updated.gid,
        externalUrl: updated.permalink_url || null,
        metadata: { project_gid: projectGid, parent_gid: parentGid || null },
      });
      return updated;
    }

    let created;
    if (parentGid) {
      created = await asanaRequest('POST', `/tasks/${parentGid}/subtasks`, payload);
    } else {
      created = await asanaRequest('POST', '/tasks', { ...payload, projects: [projectGid] });
    }
    await upsertExternalRef({
      transactionId,
      entityType: 'task',
      localEntityType: spec.local_entity_type,
      localEntityId: spec.local_entity_id,
      externalId: created.gid,
      externalUrl: created.permalink_url || null,
      metadata: { project_gid: projectGid, parent_gid: parentGid || null },
    });
    return created;
  }

  async function syncTransaction(transactionId) {
    if (!isConfigured()) {
      return { ok: false, error: 'Asana not configured' };
    }

    const preview = await previewTransaction(transactionId);
    if (!preview) return { ok: false, error: 'Transaction not found' };

    const projectGid = process.env.ASANA_TC_PROJECT_GID;
    const parentTask = await upsertTask({ transactionId, projectGid, spec: preview.parentTask });
    const syncedSubtasks = [];
    for (const spec of preview.subtasks) {
      syncedSubtasks.push(await upsertTask({ transactionId, projectGid, parentGid: parentTask.gid, spec }));
    }

    await coordinator.logEvent(transactionId, 'asana_synced', {
      project_gid: projectGid,
      parent_task_gid: parentTask.gid,
      subtask_count: syncedSubtasks.length,
    });

    return { ok: true, preview, parentTask, subtasks: syncedSubtasks };
  }

  return {
    isConfigured,
    previewTransaction,
    syncTransaction,
  };
}

export default createTCAsanaSyncService;
