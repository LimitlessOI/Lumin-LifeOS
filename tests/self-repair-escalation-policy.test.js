/**
 * SYNOPSIS: js — tests/self-repair-escalation-policy.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELF_REPAIR_MAX_ATTEMPTS,
  getSelfRepairAttemptStage,
  buildSelfRepairAttemptRequirements,
  isKnowledgeGapBlocker,
  shouldRunWebSearchBeforeAttempt,
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

test('knowledge-gap blockers are detected; self-fixable ones are not', () => {
  assert.equal(isKnowledgeGapBlocker('Error: Cannot find module "stripe/v2"'), true);
  assert.equal(isKnowledgeGapBlocker('this API endpoint returns invalid_request'), true);
  assert.equal(isKnowledgeGapBlocker('ECONNREFUSED contacting api.example.com'), true);
  assert.equal(isKnowledgeGapBlocker('method deprecated, removed in v5'), true);
  // Self-fixable signatures win even when a gap word is also present.
  assert.equal(isKnowledgeGapBlocker('SyntaxError: unexpected token'), false);
  assert.equal(isKnowledgeGapBlocker('FOUNDER_VISUAL_NOT_VERIFIED — css not live'), false);
  assert.equal(isKnowledgeGapBlocker(''), false);
  assert.equal(isKnowledgeGapBlocker(null), false);
});

test('adaptive web search: attempt 3 always; attempt 2 only for knowledge gaps', () => {
  // Final attempt always researches regardless of blocker.
  assert.equal(shouldRunWebSearchBeforeAttempt(3, 'anything'), true);
  assert.equal(shouldRunWebSearchBeforeAttempt(3, null), true);
  // Attempt 2 researches early only when the blocker is a knowledge gap.
  assert.equal(shouldRunWebSearchBeforeAttempt(2, 'Cannot find module "x"'), true);
  assert.equal(shouldRunWebSearchBeforeAttempt(2, 'SyntaxError: unexpected token'), false);
  assert.equal(shouldRunWebSearchBeforeAttempt(2, null), false);
  // Attempt 1 never researches.
  assert.equal(shouldRunWebSearchBeforeAttempt(1, 'Cannot find module "x"'), false);
  // Backward compatible: called with attempt only.
  assert.equal(shouldRunWebSearchBeforeAttempt(3), true);
  assert.equal(shouldRunWebSearchBeforeAttempt(2), false);
});
