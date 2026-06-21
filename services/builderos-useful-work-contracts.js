/**
 * SYNOPSIS: Exports validateQueueContract — services/builderos-useful-work-contracts.js.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @module services/builderos-useful-work-contracts
 * @description Useful work contracts for BuilderOS autonomous execution paths
 */

export const BUILDEROS_CONTRACTS = {
  builder_continuous_queue: {
    name: 'Builder Continuous Queue',
    objective: 'Process queued work continuously',
    allowed_trigger_conditions: ['new work available', 'work timeout'],
    required_useful_work_evidence: ['work completion', 'work failure'],
    idle_condition: 'no queued work',
    stop_conditions: ['work completed', 'work failed'],
    fake_progress_indicators: ['estimated time remaining'],
    max_retry_per_task: 3,
    loop_boundary: 'daily',
    receipt_requirements: ['work completion receipt']
  },
  governed_overnight_autonomy: {
    name: 'Governed Overnight Autonomy',
    objective: 'Process work during overnight hours',
    allowed_trigger_conditions: ['overnight hours', 'work timeout'],
    required_useful_work_evidence: ['work completion', 'work failure'],
    idle_condition: 'no queued work',
    stop_conditions: ['work completed', 'work failed'],
    fake_progress_indicators: ['estimated time remaining'],
    max_retry_per_task: 3,
    loop_boundary: 'overnight',
    receipt_requirements: ['work completion receipt']
  }
};

export function validateQueueContract({ hasQueuedWork, hasKey }) {
  if (!hasKey) return { ok: false, reason: 'missing_key', halt: true, idle: false };
  if (!hasQueuedWork) return { ok: false, reason: 'no_queued_work', halt: false, idle: true };
  return { ok: true, reason: 'contract_passed' };
}

export function validateOvernightContract({ hasKey, readinessReady, adamRequired, repairQueueOpen, proofStale }) {
  if (!hasKey) return { ok: false, reason: 'missing_key', halt: true, idle: false };
  if (adamRequired) return { ok: false, reason: 'adam_action_required', halt: true, idle: false };
  const hasWork = readinessReady || repairQueueOpen > 0 || proofStale;
  if (!hasWork) return { ok: false, reason: 'no_useful_work', halt: false, idle: true };
  return { ok: true, reason: 'contract_passed' };
}

export function getContractSummary(contractName) {
  return BUILDEROS_CONTRACTS[contractName] || null;
}