/**
 * SYNOPSIS: Proves the staffing ladder actually constrains something — that the
 * floor refuses a cheap answer to a load-bearing question, and that escalation
 * cannot happen silently.
 *
 * A guard that only ever passes is decoration. Several of these tests construct
 * the violation deliberately and require the refusal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAFF_TIER,
  TIER_RANK,
  TASK_CLASS,
  TIER_FLOOR,
  OFFICER_STAFF,
  startingTier,
  isTierPermitted,
  escalate,
  FLOOR_PROTECTED_CHANNELS,
} from '../config/officer-staff.js';
import { auditChannelFloors, auditStaffAssignments } from '../scripts/verify-officer-staffing.mjs';

test('the cheapest rung is a script, not a small model', () => {
  assert.equal(TIER_RANK[STAFF_TIER.DETERMINISTIC], 0);
  assert.ok(TIER_RANK[STAFF_TIER.FREE_MODEL] > TIER_RANK[STAFF_TIER.DETERMINISTIC]);
});

test('a decidable question starts at a script', () => {
  assert.equal(startingTier(TASK_CLASS.LOOKUP), STAFF_TIER.DETERMINISTIC);
  assert.equal(startingTier(TASK_CLASS.MECHANICAL), STAFF_TIER.DETERMINISTIC);
});

test('judgment may never be served cheaply, at any confidence', () => {
  assert.equal(TIER_FLOOR[TASK_CLASS.JUDGMENT], STAFF_TIER.STRONG_MODEL);
  for (const cheap of [STAFF_TIER.DETERMINISTIC, STAFF_TIER.CACHED, STAFF_TIER.FREE_MODEL, STAFF_TIER.CHEAP_MODEL]) {
    const verdict = isTierPermitted(TASK_CLASS.JUDGMENT, cheap);
    assert.equal(verdict.permitted, false, `${cheap} must not be allowed to answer a judgment question`);
    assert.equal(verdict.reason, 'below_floor');
  }
});

test('a strong model answering a lookup is permitted but wasteful — the floor is a floor, not a ceiling', () => {
  assert.equal(isTierPermitted(TASK_CLASS.LOOKUP, STAFF_TIER.STRONG_MODEL).permitted, true);
});

test('escalation cannot happen without a stated cause', () => {
  assert.throws(() => escalate(STAFF_TIER.FREE_MODEL), /escalation_requires_a_cause/);
  const up = escalate(STAFF_TIER.FREE_MODEL, 'free tier returned low confidence on a schema question');
  assert.equal(up.tier, STAFF_TIER.CHEAP_MODEL);
  assert.equal(up.escalated, true);
});

test('escalation stops at the top rather than pretending', () => {
  const at = escalate(STAFF_TIER.STRONG_MODEL, 'still uncertain');
  assert.equal(at.escalated, false);
  assert.equal(at.reason, 'already_at_strongest');
});

test('unknown task classes and tiers are refused, not defaulted', () => {
  assert.throws(() => startingTier('vibes'), /unknown_task_class/);
  assert.equal(isTierPermitted(TASK_CLASS.DRAFT, 'telepathy').permitted, false);
});

// ── The offices ──────────────────────────────────────────────────────────────

test('every office reserves some judgment to the officer', () => {
  for (const [officer, spec] of Object.entries(OFFICER_STAFF)) {
    assert.ok(
      spec.judgment_reserved_to_officer.length > 0,
      `${officer}: an office whose staff may decide everything is not an office`
    );
  }
});

test('most staff work is answerable with zero tokens', () => {
  const duties = Object.values(OFFICER_STAFF).flatMap((s) => s.staff_may);
  const free = duties.filter((d) => d.tier === STAFF_TIER.DETERMINISTIC);
  assert.ok(free.length / duties.length > 0.5, 'if most gathering still needs a model, the ladder is not earning its keep');
});

test('a staff duty naming an implementation names one that exists', () => {
  assert.deepEqual(
    auditStaffAssignments().filter((f) => f.id === 'STAFF_IMPLEMENTATION_MISSING'),
    [],
    'claiming capacity that has no file is how a ladder becomes a wish list'
  );
});

test("Sentry's Layer B judgment is not delegated to a cheap assistant", () => {
  const layerB = OFFICER_STAFF.sentry.staff_may.find((d) => d.task.includes('critique'));
  assert.equal(layerB.tier, STAFF_TIER.STRONG_MODEL, 'SO-002 requires real UX reasoning, not an endpoint 200');
});

// ── The guard itself ─────────────────────────────────────────────────────────

test('the live router keeps every load-bearing channel above the floor', () => {
  assert.deepEqual(auditChannelFloors(), [], 'SO-003 must hold against the real router, not a copy of it');
});

test('the guard is not vacuous: a cheap load-bearing channel is caught', () => {
  // Constructed violation. If this passes silently the guard proves nothing.
  const verdict = isTierPermitted(TASK_CLASS.JUDGMENT, STAFF_TIER.CHEAP_MODEL);
  assert.equal(verdict.permitted, false);
  assert.equal(verdict.floor, STAFF_TIER.STRONG_MODEL);
  assert.ok(FLOOR_PROTECTED_CHANNELS.includes('chair'));
});
