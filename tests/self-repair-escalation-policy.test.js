/**
 * SYNOPSIS: js — tests/self-repair-escalation-policy.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELF_REPAIR_MAX_ATTEMPTS,
  getSelfRepairAttemptStage,
  buildSelfRepairAttemptRequirements,
} from '../services/self-repair-escalation-policy.js';

test('self repair policy uses three same-tier attempts', () => {
  assert.equal(SELF_REPAIR_MAX_ATTEMPTS, 3);
  assert.equal(getSelfRepairAttemptStage(1), 'same_tier_initial');
  assert.equal(getSelfRepairAttemptStage(2), 'same_tier_lessons');
  assert.equal(getSelfRepairAttemptStage(3), 'same_tier_research_consensus');
});

test('later attempts require more context', () => {
  const one = buildSelfRepairAttemptRequirements(1);
  const two = buildSelfRepairAttemptRequirements(2);
  const three = buildSelfRepairAttemptRequirements(3);
  assert.equal(one.require_prior_lessons, false);
  assert.equal(two.require_prior_lessons, true);
  assert.equal(two.require_research, false);
  assert.equal(three.require_research, true);
  assert.equal(three.require_consensus_context, true);
});
