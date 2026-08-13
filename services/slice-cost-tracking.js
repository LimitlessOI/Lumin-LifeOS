/**
 * SYNOPSIS: Hard-gate slice duration_ms + tokens_used on every BUILD_QUEUE done.
 * Founder: cannot score the system without tracking every slice.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const SLICE_COST_UNTRACKED = 'SLICE_COST_UNTRACKED';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pull token usage from ship/codegen/orchestrator result shapes.
 * Exact/no-codegen ships resolve to 0 tokens (still tracked).
 */
export function extractTokenUsage(extra = {}) {
  const usage = (extra && typeof extra === 'object')
    ? (extra.usage || extra.codegen?.usage || extra)
    : {};
  const explicit = num(usage.tokens_used ?? usage.total_tokens ?? extra.tokens_used ?? extra.total_tokens);
  if (explicit != null) return Math.max(0, Math.round(explicit));
  const prompt = num(usage.prompt_tokens ?? extra.prompt_tokens) || 0;
  const completion = num(usage.completion_tokens ?? extra.completion_tokens) || 0;
  if (prompt > 0 || completion > 0) return Math.max(0, Math.round(prompt + completion));
  if (extra.no_codegen === true || extra.action_type === 'write_file_exact' || extra.pre_existing === true) {
    return 0;
  }
  return null;
}

/**
 * Stamp wall-clock duration and tokens onto a queue step. Always preferred
 * before any DONE mark. Returns the stamped fields (may still fail assert).
 */
export function stampSliceCost(step, extra = {}) {
  if (!step || typeof step !== 'object') return { duration_ms: null, tokens_used: null };

  const started = Date.parse(
    step.started_at || step.last_attempt_at || extra.started_at || extra.last_attempt_at || '',
  );
  const fromExtra = num(extra.duration_ms);
  if (Number.isFinite(started)) {
    step.duration_ms = Math.max(0, Date.now() - started);
  } else if (fromExtra != null) {
    step.duration_ms = Math.max(0, Math.round(fromExtra));
  }

  const tokens = extractTokenUsage({
    ...extra,
    action_type: extra.action_type || step.action_type,
    pre_existing: extra.pre_existing === true || step.pre_existing === true,
    no_codegen: extra.no_codegen === true
      || step.action_type === 'write_file_exact'
      || step.pre_existing === true,
  });
  if (tokens != null) step.tokens_used = tokens;

  const usd = num(extra.estimated_usd ?? extra.usage?.estimated_usd ?? extra.codegen?.usage?.estimated_usd);
  if (usd != null && usd > 0) step.estimated_usd = usd;

  return { duration_ms: step.duration_ms ?? null, tokens_used: step.tokens_used ?? null };
}

/** Fail-closed: DONE is illegal without both fields. */
export function assertSliceCostTracked(step) {
  const duration = num(step?.duration_ms);
  if (duration == null || duration < 0) {
    return { ok: false, reason: `${SLICE_COST_UNTRACKED}: duration_ms required on every built slice` };
  }
  const tokens = num(step?.tokens_used);
  if (tokens == null || tokens < 0) {
    return { ok: false, reason: `${SLICE_COST_UNTRACKED}: tokens_used required on every built slice (0 allowed for exact/no-codegen)` };
  }
  return { ok: true, duration_ms: duration, tokens_used: tokens };
}

/**
 * Stamp then assert. On failure, do not leave a false-DONE — caller must refuse.
 */
export function requireSliceCostTracked(step, extra = {}) {
  stampSliceCost(step, extra);
  return assertSliceCostTracked(step);
}

/**
 * Scoreboard from a BUILD_QUEUE — for founder scoring / control-plane.
 */
export function summarizeQueueSliceCosts(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const done = steps.filter((s) => String(s.status || '').toLowerCase() === 'done');
  const tracked = done.filter((s) => assertSliceCostTracked(s).ok);
  const untracked = done.filter((s) => !assertSliceCostTracked(s).ok);
  const total_duration_ms = tracked.reduce((a, s) => a + Number(s.duration_ms), 0);
  const total_tokens = tracked.reduce((a, s) => a + Number(s.tokens_used), 0);
  const recent = tracked
    .slice()
    .sort((a, b) => String(b.shipped_at || b.completed_at || '').localeCompare(String(a.shipped_at || a.completed_at || '')))
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      target_file: s.target_file,
      product_id: s.product_id || queue.product_id || null,
      duration_ms: s.duration_ms,
      tokens_used: s.tokens_used,
      estimated_usd: s.estimated_usd ?? null,
      shipped_via: s.shipped_via || null,
      commit_sha: s.commit_sha || null,
      shipped_at: s.shipped_at || s.completed_at || null,
    }));
  return {
    schema: 'slice_cost_scoreboard_v1',
    product_id: queue?.product_id || null,
    done_total: done.length,
    tracked_done: tracked.length,
    untracked_done: untracked.length,
    tracking_rate: done.length ? tracked.length / done.length : null,
    total_duration_ms,
    total_tokens_used: total_tokens,
    avg_duration_ms: tracked.length ? Math.round(total_duration_ms / tracked.length) : null,
    avg_tokens_used: tracked.length ? Math.round(total_tokens / tracked.length) : null,
    untracked_ids: untracked.map((s) => s.id).slice(0, 50),
    recent_tracked: recent,
  };
}
