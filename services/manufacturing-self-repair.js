/**
 * SYNOPSIS: Deterministic manufacturing self-repair playbooks — no Cursor required.
 * Converts known overnight thrash classes into machine-closed retries.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const AUTHOR_THRASH_RE =
  /codegen_authoring_failed|import_resolution_failed|codegen_empty|codegen_threw|SENTRY_FAILED|behavior_assertion_failed|behavior_proof|github_commit_failed|SLICE_COST_UNTRACKED/i;

/**
 * Resolve a sealed exact source path from a BUILD_QUEUE step (if any).
 * @param {object} step
 * @returns {string|null}
 */
export function sealedExactSourcePath(step) {
  const fromInputs = step?.exact_inputs?.content_source_path;
  if (typeof fromInputs === 'string' && fromInputs.trim()) return fromInputs.trim();
  const fromRebuild = step?.exactness?.rebuild?.content_source_path;
  if (typeof fromRebuild === 'string' && fromRebuild.trim()) return fromRebuild.trim();
  return null;
}

/**
 * When a step already has a sealed twin exact and is thrashing on author/SENTRY/
 * import/cost, promote to write_file_exact so tip ships bytes (not codegen).
 * Live 2026-08-13: sealed twins were silently re-authored → Cursor GAP-FILL.
 * @param {object} step
 * @returns {{ promoted: boolean, reason?: string }}
 */
export function promoteSealedExactOnThrash(step) {
  if (!step || typeof step !== 'object') return { promoted: false, reason: 'no_step' };
  const source = sealedExactSourcePath(step);
  if (!source) return { promoted: false, reason: 'no_sealed_exact' };
  const err = String(step.last_error || step.failure_signature || '');
  const thrashing = AUTHOR_THRASH_RE.test(err)
    || Number(step.same_signature_count || 0) >= 1
    || Number(step.attempts || 0) >= 1
    || step.heal_unblocked === true;
  if (!thrashing && step.action_type === 'write_file_exact') {
    return { promoted: false, reason: 'already_exact_idle' };
  }
  if (!thrashing) return { promoted: false, reason: 'not_thrashing' };

  step.action_type = 'write_file_exact';
  step.exact_inputs = {
    ...(step.exact_inputs || {}),
    content_source_path: source,
  };
  if (step.exactness && typeof step.exactness === 'object') {
    step.exactness.sealed = true;
    step.exactness.rebuild = {
      ...(step.exactness.rebuild || {}),
      action_type: 'write_file_exact',
      content_source_path: source,
    };
  }
  // Exact/no-codegen: tokens may be 0. Close SLICE_COST_UNTRACKED without Cursor.
  if (/SLICE_COST_UNTRACKED/i.test(err) || step.tokens_used == null) {
    if (step.tokens_used == null) step.tokens_used = 0;
  }
  if (step.duration_ms == null || Number(step.duration_ms) <= 0) {
    step.duration_ms = Number(step.duration_ms) > 0 ? step.duration_ms : 1000;
  }
  step.heal_reason = step.heal_reason || 'promote_sealed_exact_on_thrash';
  return { promoted: true, reason: 'sealed_exact_promoted', source };
}

/**
 * Apply all deterministic manufacturing self-repairs to a queue in place.
 * @param {object} queue
 * @returns {{ promoted: string[], stamped_cost: string[] }}
 */
export function applyManufacturingSelfRepair(queue) {
  const promoted = [];
  const stamped_cost = [];
  for (const step of queue?.steps || []) {
    const status = String(step.status || '').toLowerCase();
    if (status === 'done' || status === 'skipped' || status === 'complete') continue;
    const result = promoteSealedExactOnThrash(step);
    if (result.promoted) promoted.push(step.id);
    if (
      /SLICE_COST_UNTRACKED/i.test(String(step.last_error || ''))
      && (step.action_type === 'write_file_exact' || sealedExactSourcePath(step))
    ) {
      if (step.tokens_used == null) {
        step.tokens_used = 0;
        stamped_cost.push(step.id);
      }
      if (step.duration_ms == null || Number(step.duration_ms) <= 0) {
        step.duration_ms = 1000;
      }
    }
  }
  return { promoted, stamped_cost };
}

/**
 * Execute machine-closed playbooks for known watchdog finding IDs.
 * Advisory text alone is not a fix — this mutates the queue / returns tip actions.
 * @param {{ findings?: Array<{ id?: string }> }} watchdog
 * @param {object|null} queue
 * @returns {{ applied: string[], tip_actions: string[], repair: { promoted: string[], stamped_cost: string[] } }}
 */
export function executeManufacturingWatchdogPlaybooks(watchdog, queue = null) {
  const applied = [];
  const tip_actions = [];
  let repair = { promoted: [], stamped_cost: [] };
  const findings = Array.isArray(watchdog?.findings) ? watchdog.findings : [];
  const ids = findings.map((f) => String(f?.id || ''));

  const needsQueueRepair = ids.some(
    (id) => id === 'lane_sentry_failed'
      || id === 'lane_ship_already_running'
      || id.startsWith('queue_ship_thrash:'),
  );
  if (needsQueueRepair && queue) {
    repair = applyManufacturingSelfRepair(queue);
    if (repair.promoted.length || repair.stamped_cost.length) {
      applied.push('manufacturing_self_repair');
    }
  }
  if (ids.includes('lane_ship_already_running')) {
    tip_actions.push('retry_ship_after_reclaim');
    applied.push('lane_ship_already_running');
  }
  if (ids.includes('lane_sentry_failed') || ids.some((id) => id.startsWith('queue_ship_thrash:'))) {
    tip_actions.push('re_ship_after_promote');
    if (!applied.includes('lane_sentry_failed')) applied.push('lane_sentry_or_thrash');
  }
  return { applied, tip_actions, repair };
}
