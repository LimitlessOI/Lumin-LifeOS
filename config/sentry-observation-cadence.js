/**
 * SYNOPSIS: SENTRY observation cadence — cheap constant watch, strong only
 * when there is work or on a slower deep/full clock. Intervals are Conductor
 * defaults so the founder does not have to pick minutes.
 *
 * Founder (2026-08-12): a low model monitoring constantly; escalate to the
 * appropriate model to solve; a better model looks periodically; full audit
 * on a slower clock; not too expensive, super effective.
 *
 * Cost rule: a green system must not pay for a model to say "still green"
 * (zero-waste). The constant layer is deterministic SENTRY. A cheap model
 * runs only when a heartbeat finding is new. A strong model runs on the
 * 15-minute deep look over still-open issues, and on novel findings in the
 * 35-minute full audit.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const SENTRY_CADENCE = Object.freeze({
  heartbeat: Object.freeze({
    id: 'heartbeat',
    intervalMs: 2 * 60 * 1000,
    auditKind: 'system',
    model: 'cheap',
    reviewOpen: false,
    why: 'Constant watch: factories, Taloa, false-blocks. Free when green; cheap model only on a new finding.',
  }),
  deep_look: Object.freeze({
    id: 'deep_look',
    intervalMs: 15 * 60 * 1000,
    auditKind: 'system',
    model: 'strong',
    reviewOpen: true,
    why: 'Better model re-examines issues that are still true. Does not run if nothing is open.',
  }),
  full_audit: Object.freeze({
    id: 'full_audit',
    intervalMs: 35 * 60 * 1000,
    auditKind: 'full',
    model: 'strong',
    reviewOpen: false,
    why: 'CI, backlogs, workflows, receipts, plus system. Strong model only on new findings.',
  }),
});

/**
 * Pure — should this pass spend a model call?
 * @param {{ model: 'cheap'|'strong'|'none', novelCount?: number, openCount?: number, reviewOpen?: boolean }} input
 */
export function observationAiBudget({
  model = 'none',
  novelCount = 0,
  openCount = 0,
  reviewOpen = false,
} = {}) {
  const hasNovel = Number(novelCount) > 0;
  const hasOpenWork = reviewOpen === true && Number(openCount) > 0;
  if (!hasNovel && !hasOpenWork) {
    return { callAi: false, tier: null, reason: 'no_work' };
  }
  if (model === 'none') {
    return { callAi: false, tier: null, reason: 'deterministic' };
  }
  if (model === 'cheap') {
    return { callAi: true, tier: 'cheap', reason: hasNovel ? 'novel_finding' : 'open_finding' };
  }
  return { callAi: true, tier: 'strong', reason: hasNovel ? 'novel_finding' : 'open_finding' };
}

export function cadenceForTier(tierId) {
  return SENTRY_CADENCE[tierId] || null;
}
