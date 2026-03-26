/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-workflow-service.js
 * Derives workflow tasks from machine-readable TC listing/buyer workflow specs.
 */

import { getTCWorkflowSpec } from './tc-workflow-specs.js';

function hasEvent(events, names = []) {
  const wanted = new Set(names);
  return events.some((event) => wanted.has(event.event_type));
}

function workflowStatusForTask(task, overview) {
  const events = overview.recent_events || [];
  const stage = overview.status?.stage || '';
  const missingDocs = overview.status?.missing_docs || [];
  const openDocRequests = overview.document_requests || [];

  const completeByEvent = task.completeOn && hasEvent(events, task.completeOn);
  const completeByDocHint = task.docHints && task.docHints.some((hint) => {
    const lower = String(hint).toLowerCase();
    return !missingDocs.some((doc) => String(doc.name || '').toLowerCase().includes(lower));
  });
  const openRequestForTask = openDocRequests.some((item) => {
    const lower = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    return task.docHints?.some((hint) => lower.includes(String(hint).toLowerCase()));
  });

  if (completeByEvent || completeByDocHint) return 'completed';
  if (task.recurring && hasEvent(events, task.completeOn || [])) return 'active';
  if (task.docHints && openRequestForTask) return 'in_progress';
  if (stage === 'blocked' && !task.recurring) return 'blocked';
  return 'pending';
}

export function createTCWorkflowService({ portalService, logger = console }) {
  async function buildWorkflow(transactionId) {
    const overview = await portalService.buildOverview(transactionId, { view: 'agent' });
    if (!overview) return null;
    const spec = getTCWorkflowSpec(overview.transaction.agent_role);

    const stages = spec.stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      tasks: stage.tasks.map((task) => ({
        key: task.key,
        label: task.label,
        recurring: !!task.recurring,
        status: workflowStatusForTask(task, overview),
      })),
    }));

    return {
      transaction: overview.transaction,
      workflow: {
        key: spec.key,
        label: spec.label,
        stages,
      },
    };
  }

  return {
    buildWorkflow,
  };
}

export default createTCWorkflowService;
