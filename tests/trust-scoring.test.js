/**
 * SYNOPSIS: Proves the trust-scoring policy actually implements the founder's
 * incentive rules rather than describing them. Every assertion here is a rule the
 * founder stated; if one of these fails, the scoreboard is teaching the wrong
 * behavior no matter what the docs claim.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTrustDelta,
  detectSystemicPattern,
  buildCapabilityProfile,
  TRUST_EVENT_CLASS,
  FORBIDDEN_SIGNALS,
  TRUST_WEIGHTS,
} from '../config/trust-scoring.js';

test('Reality dominates: no single other signal can outweigh a Reality result', () => {
  const others = Object.entries(TRUST_WEIGHTS)
    .filter(([k]) => !['reality_verified', 'reality_failed', 'concealment'].includes(k))
    .map(([, w]) => Math.abs(w));
  assert.ok(
    Math.max(...others) < TRUST_WEIGHTS.reality_verified,
    'a leading indicator must never be worth more than the outcome it predicts'
  );
});

test('finding your own defect scores strictly better than letting it escape', () => {
  const selfCaught = computeTrustDelta({ self_caught_defect: true });
  const escaped = computeTrustDelta({ escaped_defect: true });
  assert.ok(
    selfCaught.delta > escaped.delta,
    'if hiding ever beat self-reporting, the scoreboard would teach factories to defend their output'
  );
  assert.ok(selfCaught.delta > 0, 'self-reporting must be a net gain, not merely a smaller loss');
});

test('concealment is a trustworthiness event, not a capability event', () => {
  const concealed = computeTrustDelta({ concealment_detected: true });
  assert.equal(concealed.event_class, TRUST_EVENT_CLASS.TRUSTWORTHINESS);
  assert.equal(concealed.concealment, true);
  const ordinaryError = computeTrustDelta({ reality_verified: false, reality_scored: true });
  assert.equal(ordinaryError.event_class, TRUST_EVENT_CLASS.CAPABILITY);
  assert.ok(
    concealed.delta < ordinaryError.delta,
    'concealing a known defect must cost dramatically more than an honest failure'
  );
});

test('theater detection is treated as concealment, reusing the existing signal', () => {
  const t = computeTrustDelta({ theater_detected: true });
  assert.equal(t.event_class, TRUST_EVENT_CLASS.TRUSTWORTHINESS);
});

test('one proven concealment cannot be averaged away by volume of good work', () => {
  const profile = buildCapabilityProfile({
    attempts: 500,
    reality_verified_count: 499,
    reality_failed_count: 1,
    concealment_count: 1,
  });
  assert.equal(profile.trustworthiness.disqualified_for_high_stakes, true);
});

test('a cheap wrong answer never outscores a costly right one', () => {
  const cheapWrong = computeTrustDelta({
    reality_verified: false,
    reality_scored: true,
    efficient_relative_to_peers: true,
  });
  const costlyRight = computeTrustDelta({ reality_verified: true, efficient_relative_to_peers: false });
  assert.ok(costlyRight.delta > cheapWrong.delta);
});

test('efficiency only applies after correctness passes', () => {
  const withRegression = computeTrustDelta({
    reality_verified: true,
    regression_introduced: true,
    efficient_relative_to_peers: true,
  });
  assert.ok(
    !withRegression.reasons.some((r) => r.signal === 'efficiency_bonus'),
    'efficiency must not be credited when a regression shipped'
  );
});

test('honest uncertainty is rewarded and false certainty is penalized', () => {
  assert.ok(computeTrustDelta({ honest_uncertainty: true }).delta > 0);
  assert.ok(computeTrustDelta({ false_certainty: true }).delta < 0);
});

test('claiming verification without evidence costs more than providing it gains', () => {
  const claimed = computeTrustDelta({ verification_claimed_without_evidence: true });
  const provided = computeTrustDelta({ verification_evidence_provided: true });
  assert.ok(Math.abs(claimed.delta) > provided.delta);
});

test('reuse is rewarded and unnecessary invention is penalized', () => {
  assert.ok(computeTrustDelta({ reused_existing: true }).delta > 0);
  assert.ok(computeTrustDelta({ unnecessary_invention: true }).delta < 0);
});

test('forbidden signals are recorded with reasons and are not scored', () => {
  for (const key of Object.keys(FORBIDDEN_SIGNALS)) {
    assert.equal(TRUST_WEIGHTS[key], undefined, `${key} must never become a weight`);
  }
  // Passing them changes nothing.
  const noisy = computeTrustDelta({ bugs_fixed: 40, lines_of_code: 9000, missions_completed: 12 });
  assert.equal(noisy.delta, 0);
});

test('every delta explains itself so a trust change is auditable', () => {
  const scored = computeTrustDelta({ reality_verified: true, reused_existing: true });
  assert.equal(scored.delta, TRUST_WEIGHTS.reality_verified + TRUST_WEIGHTS.reuse_existing);
  assert.deepEqual(
    scored.reasons.map((r) => r.signal).sort(),
    ['reality_verified', 'reuse_existing']
  );
});

test('the same failure across independent factories indicts the system, not a factory', () => {
  const systemic = detectSystemicPattern([
    { failure_signature: 'missing_column_spec', factory_id: 'factory-1' },
    { failure_signature: 'missing_column_spec', factory_id: 'factory-2' },
    { failure_signature: 'missing_column_spec', factory_id: 'factory-1' },
  ]);
  assert.equal(systemic.length, 1);
  assert.equal(systemic[0].attribution, 'system');
  assert.equal(systemic[0].distinct_factories, 2);
});

test('one factory failing repeatedly is NOT called a system defect', () => {
  const systemic = detectSystemicPattern([
    { failure_signature: 'bad_sql', factory_id: 'factory-1' },
    { failure_signature: 'bad_sql', factory_id: 'factory-1' },
    { failure_signature: 'bad_sql', factory_id: 'factory-1' },
  ]);
  assert.deepEqual(systemic, [], 'that is a capability finding about one factory, not a design indictment');
});

test('capability is a profile, not one number, and unscored work is visible', () => {
  const profile = buildCapabilityProfile({
    factory_id: 'factory-1',
    attempts: 10,
    reality_verified_count: 4,
    reality_failed_count: 1,
    self_caught_count: 3,
    escaped_defect_count: 1,
  });
  assert.equal(profile.dimensions.reality_performance, 0.8);
  assert.equal(profile.dimensions.self_detection, 0.75);
  assert.equal(profile.reality_unscored, 5, 'work whose Reality was never scored must not look like success');
});
