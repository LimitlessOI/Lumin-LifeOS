/**
 * SYNOPSIS: Architect — turns a Chair-approved SENTRY finding into a real,
 * buildable BUILD_QUEUE.json step. The "Architect corrects the BLUEPRINT
 * only (never code)" half of the D7 repair pipeline, built as real running
 * code instead of doctrine.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Scope, stated honestly: only `workflow_health` findings get a real,
 * automatically-written blueprint step here, because that check type is the
 * only one where the fix location is unambiguous (the workflow file path is
 * IN the finding itself). `ci_health` findings name a failing commit/run but
 * not which file broke — writing a target_file for those would mean
 * guessing, which is exactly the fabrication this whole system exists to
 * refuse. Those findings are marked `architect_status: needs_manual_targeting`
 * instead of silently skipped or guessed at. `product_backlog` findings never
 * reach this module at all (Chair routes them to founder escalation, not
 * approval) — Architect never gets a business decision to "write" here.
 */
import fs from 'node:fs';
import { loadBuildQueue, persistQueue, STEP_STATUS } from './product-build-orchestrator.js';

const ARCHITECT_TARGET_PRODUCT = 'builderos';

/**
 * Pure — derives the workflow file path from a workflow_health finding's id
 * (format: "broken_workflow:<path>"). Returns null if the shape doesn't match
 * rather than guessing.
 */
export function extractWorkflowPathFromFinding(finding) {
  if (!finding || finding.check !== 'workflow_health') return null;
  const match = /^broken_workflow:(.+)$/.exec(String(finding.id || ''));
  return match ? match[1] : null;
}

/**
 * Pure — builds the BUILD_QUEUE step object for an approved finding. Returns
 * null for a finding type this module doesn't know how to target (fail
 * closed, never fabricate a target_file).
 */
export function buildQueueStepFromFinding(finding) {
  if (!finding || finding.chair_status !== 'approved') return null;

  if (finding.check === 'workflow_health') {
    const targetFile = extractWorkflowPathFromFinding(finding);
    if (!targetFile) return null;
    return {
      id: `sentry-${finding.id}`,
      status: STEP_STATUS.PENDING,
      target_file: targetFile,
      task: finding.summary,
      spec: finding.proposed_solution,
      depends_on: [],
      founder_gated: false,
      priority: 'urgent',
      source: 'sentry_chair_architect',
      finding_id: finding.id,
    };
  }

  // ci_health and anything else: no safe, unambiguous target_file available
  // from the finding alone — do not guess.
  return null;
}

/**
 * Writes an approved finding into builderos's BUILD_QUEUE.json as a
 * high-priority step (prepended, so the existing factory picks it up next
 * cycle before older, lower-urgency work), if a step for this exact finding
 * doesn't already exist. Returns { written: bool, reason } — never throws on
 * a finding it can't target; that's an honest "not yet", not a failure.
 */
export function writeApprovedFindingToBlueprint(finding, { root } = {}) {
  const step = buildQueueStepFromFinding(finding);
  if (!step) {
    return { written: false, reason: 'no_safe_target_file' };
  }

  const queue = loadBuildQueue(ARCHITECT_TARGET_PRODUCT, root ? { root } : {});
  if (!queue || !Array.isArray(queue.steps)) {
    return { written: false, reason: 'queue_load_failed' };
  }

  const already = queue.steps.some((s) => s.finding_id === finding.id || s.id === step.id);
  if (already) {
    return { written: false, reason: 'already_queued' };
  }

  queue.steps.unshift(step);
  persistQueue(queue, root ? { root } : {});
  return { written: true, reason: 'queued', step_id: step.id, product_id: ARCHITECT_TARGET_PRODUCT };
}

/**
 * Processes every 'approved' finding in a reviewed list, writing what it
 * safely can and marking the rest honestly. Returns the SAME findings array
 * shape with `architect_status` added — does not mutate the input.
 */
export function runArchitectPass(findings, { root } = {}) {
  const list = Array.isArray(findings) ? findings : [];
  return list.map((finding) => {
    if (finding.chair_status !== 'approved') {
      return finding; // Architect only acts on Chair-approved findings
    }
    const result = writeApprovedFindingToBlueprint(finding, { root });
    if (result.written) {
      return { ...finding, architect_status: 'queued_to_blueprint', architect_target: `${result.product_id}/${result.step_id}` };
    }
    if (result.reason === 'already_queued') {
      return { ...finding, architect_status: 'already_queued' };
    }
    return { ...finding, architect_status: 'needs_manual_targeting' };
  });
}
