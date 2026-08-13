/**
 * SYNOPSIS: Deterministic manufacturing self-repair playbooks — no Cursor required.
 * Converts known overnight thrash classes into machine-closed retries.
 * Never-stop Collectibles print unless founder sets FACTORY_3_REASSIGNED=1.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectiblesLaneReassigned,
  isCollectiblesPrintSlice,
} from '../config/overlay-print-sequence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const AUTHOR_THRASH_RE =
  /codegen_authoring_failed|import_resolution_failed|codegen_empty|codegen_threw|SENTRY_FAILED|behavior_assertion_failed|behavior_proof|github_commit_failed|SLICE_COST_UNTRACKED|hidden_dependency|codegen_stub|GROUNDING_FAIL|missing_sql_table/i;

export function conventionSealedExactPath(stepId) {
  const id = String(stepId || '').trim();
  if (!id) return null;
  return `docs/products/universal-overlay/twins/steps/${id}.exact`;
}

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
 * Attach twins/steps/<id>.exact when present and step has no sealed path yet.
 * @param {object} step
 * @returns {boolean}
 */
export function attachConventionSealedExact(step) {
  if (!step || typeof step !== 'object') return false;
  if (sealedExactSourcePath(step)) return false;
  const source = conventionSealedExactPath(step.id);
  if (!source) return false;
  if (!fs.existsSync(path.join(REPO_ROOT, source))) return false;
  step.exact_inputs = {
    ...(step.exact_inputs || {}),
    content_source_path: source,
  };
  step.exactness = {
    ...(step.exactness && typeof step.exactness === 'object' ? step.exactness : {}),
    sealed: true,
    rebuild: {
      action_type: 'write_file_exact',
      content_source_path: source,
    },
  };
  step.heal_reason = step.heal_reason || 'attach_convention_sealed_exact';
  return true;
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
  attachConventionSealedExact(step);
  const source = sealedExactSourcePath(step);
  if (!source) return { promoted: false, reason: 'no_sealed_exact' };
  // Never promote to a missing exact — that is the hidden_dependency thrash.
  if (!fs.existsSync(path.join(REPO_ROOT, source))) {
    if (/hidden_dependency|Missing source file/i.test(String(step.last_error || ''))) {
      step.action_type = 'author_then_write';
      delete step.exact_inputs;
      if (step.exactness) step.exactness = { ...(step.exactness || {}), sealed: false };
      step.heal_reason = 'demote_missing_exact_to_author';
      return { promoted: false, reason: 'exact_missing_demoted_to_author', source };
    }
    return { promoted: false, reason: 'exact_file_missing', source };
  }
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
 * Founder law: Collectibles print never stops unless FACTORY_3_REASSIGNED=1.
 * Unskip/undemote/clear escalation, attach convention exact, promote write_file_exact.
 * @param {object} queue
 * @returns {{ healed: string[], promoted: string[], stamped_cost: string[] }}
 */
export function forceCollectiblesNeverStopHeal(queue) {
  const healed = [];
  if (!queue || !Array.isArray(queue.steps)) {
    return { healed, promoted: [], stamped_cost: [] };
  }
  if (collectiblesLaneReassigned()) {
    return { healed, promoted: [], stamped_cost: [], skipped: 'lane_reassigned' };
  }

  for (const step of queue.steps) {
    if (!isCollectiblesPrintSlice(step)) continue;
    const st = String(step.status || '').toLowerCase();
    if (st === 'done' || st === 'complete') continue;

    const wasTerminal = st === 'skipped'
      || step.demoted === true
      || step.escalation_required === true
      || st === 'blocked';
    step.status = 'pending';
    step.demoted = false;
    step.demote_reason = null;
    step.demoted_at = null;
    step.escalation_required = false;
    step.escalation_note = null;
    step.park_until = null;
    step.heal_unblocked = true;
    step.attempts = Math.max(Number(step.attempts || 0), 1);
    if (!step.last_error) {
      step.last_error = 'codegen_authoring_failed:collectibles_never_stop_heal';
    }
    attachConventionSealedExact(step);
    if (sealedExactSourcePath(step)) {
      step.tokens_used = step.tokens_used == null ? 0 : step.tokens_used;
      step.duration_ms = Number(step.duration_ms) > 0 ? step.duration_ms : 1000;
    }
    if (wasTerminal || sealedExactSourcePath(step)) {
      step.heal_reason = 'collectibles_never_stop_heal';
      healed.push(step.id);
    }
  }

  const repair = applyManufacturingSelfRepair(queue);
  return { healed, promoted: repair.promoted, stamped_cost: repair.stamped_cost };
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
      || id === 'factory3_idle_with_collectibles_work'
      || id.startsWith('queue_ship_thrash:'),
  );
  if (needsQueueRepair && queue) {
    if (ids.includes('factory3_idle_with_collectibles_work')) {
      const never = forceCollectiblesNeverStopHeal(queue);
      repair = {
        promoted: [...never.promoted],
        stamped_cost: [...never.stamped_cost],
        healed: never.healed,
      };
      if (never.healed.length || never.promoted.length) {
        applied.push('collectibles_never_stop_heal');
      }
    }
    const self = applyManufacturingSelfRepair(queue);
    repair = {
      promoted: [...new Set([...(repair.promoted || []), ...self.promoted])],
      stamped_cost: [...new Set([...(repair.stamped_cost || []), ...self.stamped_cost])],
      healed: repair.healed || [],
    };
    if (self.promoted.length || self.stamped_cost.length) {
      applied.push('manufacturing_self_repair');
    }
  }
  if (ids.includes('lane_ship_already_running')) {
    tip_actions.push('retry_ship_after_reclaim');
    applied.push('lane_ship_already_running');
  }
  if (
    ids.includes('lane_sentry_failed')
    || ids.includes('factory3_idle_with_collectibles_work')
    || ids.some((id) => id.startsWith('queue_ship_thrash:'))
  ) {
    tip_actions.push('re_ship_after_promote');
    if (!applied.includes('lane_sentry_failed') && !applied.includes('collectibles_never_stop_heal')) {
      applied.push('lane_sentry_or_thrash');
    }
  }
  return { applied, tip_actions, repair };
}
