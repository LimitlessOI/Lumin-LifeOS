/**
 * SYNOPSIS: Founder-ratified trust-scoring policy — pure functions, no I/O, no DB.
 *
 * This exists because Reality was already measured on three separate lanes and
 * then discarded for trust purposes: `trust_adjustment.delta` was named in
 * DEPARTMENT_ROLE_CONTRACT.json with no writer and no reader, so a prediction
 * could be scored and change nothing about who gets the next job.
 *
 * The policy is here rather than inside the ledger service on purpose. What to
 * reward is a founder decision, not an implementation detail, and keeping it as
 * pure functions means every incentive claim is testable without a database.
 *
 * Ratified rules this encodes, in the founder's own framing:
 *  - "Don't reward activity. Reward correspondence with reality."
 *  - Finding your own mistake must score HIGHER than hiding it until someone
 *    else finds it. Otherwise the scoreboard teaches factories to defend output.
 *  - Concealment is not a capability signal, it is a trustworthiness signal, and
 *    carries a dramatically larger consequence than ordinary error.
 *  - No single gameable number: a rank may exist, but capability is a profile.
 *  - Efficiency counts only AFTER correctness gates pass.
 *  - "No, because that can encourage them to make bugs if they get solved" —
 *    bugs fixed is deliberately NOT an input.
 *  - Many independent factories failing the same way indicts the system, not the
 *    factory: "we have to relook at the design."
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Inputs that are deliberately NOT scored. Kept as data, not prose, so a future
 * agent adding a dimension can see what was ruled out and why.
 */
export const FORBIDDEN_SIGNALS = Object.freeze({
  bugs_fixed: 'rewarding fixes rewards creating fixable bugs',
  lines_of_code: 'rewards bloat',
  files_changed: 'rewards churn',
  missions_completed: 'rewards easy work and premature completion',
  wall_clock_speed: 'rewards cutting corners; only fastest VERIFIED result counts',
  fewest_defects_reported: 'rewards hiding defects',
});

/**
 * Weights. Reality dominates by design — everything else is a leading indicator
 * of Reality, so nothing may outweigh it.
 */
export const TRUST_WEIGHTS = Object.freeze({
  reality_verified: 10,
  reality_failed: -8,
  blueprint_fidelity_ok: 3,
  blueprint_fidelity_violation: -6,
  self_caught_defect: 4,
  escaped_defect: -5,
  peer_defect_found: 3,
  honest_uncertainty: 2,
  false_certainty: -4,
  reuse_existing: 2,
  unnecessary_invention: -3,
  integration_clean: 2,
  integration_broke_peer: -4,
  regression_introduced: -5,
  verification_evidence_provided: 2,
  verification_claimed_without_evidence: -5,
  lesson_verified: 3,
  builderos_improvement_proven: 4,
  efficiency_bonus: 1,
  concealment: -25,
});

export const TRUST_EVENT_CLASS = Object.freeze({
  CAPABILITY: 'capability',
  TRUSTWORTHINESS: 'trustworthiness',
});

/** Dimensions tracked independently so no single number can be optimized. */
export const CAPABILITY_DIMENSIONS = Object.freeze([
  'reality_performance',
  'blueprint_fidelity',
  'self_detection',
  'peer_detection',
  'uncertainty_calibration',
  'reuse_discipline',
  'integration_quality',
  'regression_avoidance',
  'verification_quality',
  'efficiency',
  'recovery_behavior',
  'lessons_contributed',
]);

function bool(v) {
  return v === true;
}

/**
 * Score one completed outcome. Pure: same input, same delta, no clock, no I/O.
 *
 * Returns the delta plus the reasons that produced it, because an unexplained
 * trust change is not auditable and a factory cannot learn from a bare number.
 */
export function computeTrustDelta(outcome = {}) {
  const reasons = [];
  let delta = 0;
  const add = (key, condition) => {
    if (!condition) return;
    const w = TRUST_WEIGHTS[key];
    delta += w;
    reasons.push({ signal: key, weight: w });
  };

  // Concealment is evaluated first and reported as a different KIND of event.
  // A concealed defect is not "a worse bug", it is evidence about honesty.
  const concealed = bool(outcome.concealment_detected) || bool(outcome.theater_detected);
  add('concealment', concealed);

  add('reality_verified', bool(outcome.reality_verified));
  add('reality_failed', outcome.reality_verified === false && outcome.reality_scored === true);

  add('blueprint_fidelity_ok', bool(outcome.blueprint_fidelity_ok));
  add('blueprint_fidelity_violation', bool(outcome.blueprint_fidelity_violation));

  // The asymmetry that makes honesty the winning strategy: self_caught (+4)
  // strictly beats escaped (-5), so surfacing your own defect is always better
  // than hoping it survives review.
  add('self_caught_defect', bool(outcome.self_caught_defect));
  add('escaped_defect', bool(outcome.escaped_defect));
  add('peer_defect_found', bool(outcome.peer_defect_found));

  add('honest_uncertainty', bool(outcome.honest_uncertainty));
  add('false_certainty', bool(outcome.false_certainty));

  add('reuse_existing', bool(outcome.reused_existing));
  add('unnecessary_invention', bool(outcome.unnecessary_invention));

  add('integration_clean', bool(outcome.integration_clean));
  add('integration_broke_peer', bool(outcome.integration_broke_peer));
  add('regression_introduced', bool(outcome.regression_introduced));

  add('verification_evidence_provided', bool(outcome.verification_evidence_provided));
  add('verification_claimed_without_evidence', bool(outcome.verification_claimed_without_evidence));

  add('lesson_verified', bool(outcome.lesson_verified));
  add('builderos_improvement_proven', bool(outcome.builderos_improvement_proven));

  // Efficiency is a tiebreaker, not a goal: it only applies once the work is
  // actually correct. A cheap wrong answer must never outscore a costly right one.
  const correctnessPassed = bool(outcome.reality_verified) && !bool(outcome.regression_introduced);
  add('efficiency_bonus', correctnessPassed && bool(outcome.efficient_relative_to_peers));

  return {
    delta,
    event_class: concealed ? TRUST_EVENT_CLASS.TRUSTWORTHINESS : TRUST_EVENT_CLASS.CAPABILITY,
    concealment: concealed,
    reasons,
    // An ordinary error is information about capability and is expected.
    // Concealment is a different category and is reported as such.
    note: concealed
      ? 'Concealment detected: trustworthiness event, not a capability event. Consequence is deliberately larger than any single capability signal.'
      : null,
  };
}

/**
 * Is a repeated failure the factory's fault or the system's?
 *
 * Founder: if independent builders keep failing the same way, "we have to relook
 * at the design ... what went wrong? Why is it set up and failed?" Blaming the
 * musicians when the score is wrong is the failure mode this prevents.
 */
export function detectSystemicPattern(outcomes = [], { minDistinctActors = 2, minOccurrences = 3 } = {}) {
  const byFailure = new Map();
  for (const o of outcomes) {
    const key = o?.failure_signature;
    if (!key) continue;
    if (!byFailure.has(key)) byFailure.set(key, { count: 0, actors: new Set() });
    const entry = byFailure.get(key);
    entry.count += 1;
    if (o.factory_id) entry.actors.add(o.factory_id);
  }
  const systemic = [];
  for (const [signature, entry] of byFailure) {
    if (entry.count >= minOccurrences && entry.actors.size >= minDistinctActors) {
      systemic.push({
        failure_signature: signature,
        occurrences: entry.count,
        distinct_factories: entry.actors.size,
        attribution: 'system',
        detail:
          'the same failure reproduced across independent factories — route upstream as a possible system, blueprint or incentive defect rather than individual capability',
      });
    }
  }
  return systemic;
}

/**
 * Build a capability profile from ledger counters. Deliberately returns per
 * dimension rates plus an overall rank score, never a single number alone: once
 * one number is the target, the system learns to maximize the number.
 */
export function buildCapabilityProfile(row = {}) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const attempts = n(row.attempts);
  const rate = (num, den) => (den > 0 ? Number((num / den).toFixed(3)) : null);
  const realityScored = n(row.reality_verified_count) + n(row.reality_failed_count);

  return {
    factory_id: row.factory_id || null,
    model_tier: row.model_tier || null,
    role: row.role || null,
    attempts,
    dimensions: {
      reality_performance: rate(n(row.reality_verified_count), realityScored),
      blueprint_fidelity: rate(n(row.blueprint_fidelity_ok_count), attempts),
      self_detection: rate(
        n(row.self_caught_count),
        n(row.self_caught_count) + n(row.escaped_defect_count)
      ),
      peer_detection: n(row.peer_defect_found_count) || 0,
      verification_quality: rate(n(row.trust_earned_count), attempts),
      reuse_discipline: rate(
        n(row.reuse_count),
        n(row.reuse_count) + n(row.unnecessary_invention_count)
      ),
      lessons_contributed: n(row.lesson_verified_count) || 0,
    },
    trustworthiness: {
      concealment_events: n(row.concealment_count) + n(row.theater_detected_count),
      // A single proven concealment is disqualifying for high-stakes allocation;
      // it is not averaged away by volume of good work.
      disqualified_for_high_stakes: n(row.concealment_count) + n(row.theater_detected_count) > 0,
    },
    trust_delta_total: n(row.trust_delta_total),
    reality_unscored: attempts - realityScored,
  };
}
