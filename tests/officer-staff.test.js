/** SYNOPSIS: Guards canonical officer staffing and prevents legacy paid-first governance from returning. */
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

test('deterministic work is the cheapest staffing mechanism', () => {
  assert.equal(TIER_RANK[STAFF_TIER.DETERMINISTIC], 0);
  assert.ok(TIER_RANK[STAFF_TIER.FREE_MODEL] > TIER_RANK[STAFF_TIER.DETERMINISTIC]);
});

test('decidable questions start deterministic', () => {
  assert.equal(startingTier(TASK_CLASS.LOOKUP), STAFF_TIER.DETERMINISTIC);
  assert.equal(startingTier(TASK_CLASS.MECHANICAL), STAFF_TIER.DETERMINISTIC);
});

test('judgment and verification require governed capability selection, not a paid tier', () => {
  assert.equal(TIER_FLOOR[TASK_CLASS.JUDGMENT], STAFF_TIER.GOVERNED_MODEL);
  assert.equal(TIER_FLOOR[TASK_CLASS.VERIFICATION], STAFF_TIER.GOVERNED_MODEL);
  assert.equal(isTierPermitted(TASK_CLASS.JUDGMENT, STAFF_TIER.FREE_MODEL).permitted, false);
  assert.equal(isTierPermitted(TASK_CLASS.JUDGMENT, STAFF_TIER.GOVERNED_MODEL).permitted, true);
});

test('legacy price-as-capability tiers cannot silently return', () => {
  assert.equal(STAFF_TIER.CHEAP_MODEL, undefined);
  assert.equal(STAFF_TIER.STRONG_MODEL, undefined);
});

test('escalation requires a cause and cannot itself authorize spend', () => {
  assert.throws(() => escalate(STAFF_TIER.FREE_MODEL), /escalation_requires_a_cause/);
  const up = escalate(STAFF_TIER.FREE_MODEL, 'free candidates require governed capability selection');
  assert.equal(up.tier, STAFF_TIER.GOVERNED_MODEL);
  const at = escalate(STAFF_TIER.GOVERNED_MODEL, 'still uncertain');
  assert.equal(at.escalated, false);
  assert.equal(at.reason, 'central_routing_required');
});

test('unknown task classes and tiers fail closed', () => {
  assert.throws(() => startingTier('vibes'), /unknown_task_class/);
  assert.equal(isTierPermitted(TASK_CLASS.DRAFT, 'telepathy').permitted, false);
});

test('every office reserves judgment to its officer', () => {
  for (const [officer, spec] of Object.entries(OFFICER_STAFF)) {
    assert.ok(spec.judgment_reserved_to_officer.length > 0, `${officer}: office must reserve judgment`);
  }
});

test('most subordinate duties remain zero-token deterministic work', () => {
  const duties = Object.values(OFFICER_STAFF).flatMap((s) => s.staff_may);
  const deterministic = duties.filter((d) => d.tier === STAFF_TIER.DETERMINISTIC);
  assert.ok(deterministic.length / duties.length > 0.5);
});

test('named staff implementations exist', () => {
  assert.deepEqual(auditStaffAssignments().filter((f) => f.id === 'STAFF_IMPLEMENTATION_MISSING'), []);
});

test("SENTRY Layer B uses governed AUDITOR capability", () => {
  const layerB = OFFICER_STAFF.sentry.staff_may.find((d) => d.task.includes('critique'));
  assert.equal(layerB.tier, STAFF_TIER.GOVERNED_MODEL);
  assert.equal(layerB.required_capability, 'AUDITOR');
});

test('canonical protected channel uses conductor, never legacy chair', () => {
  assert.ok(FLOOR_PROTECTED_CHANNELS.includes('conductor'));
  assert.ok(!FLOOR_PROTECTED_CHANNELS.includes('chair'));
});

test('live protected channels satisfy the governed floor', () => {
  assert.deepEqual(auditChannelFloors(), []);
});
