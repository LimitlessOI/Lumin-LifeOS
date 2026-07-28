/**
 * SYNOPSIS: SO-003: "the Chair debate/counsel channel ... must never be served a
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reviewFinding, reviewFindings, reviewFindingWithAI, reviewFindingsWithAI } from '../services/chair-findings-review.js';

test('reviewFinding: SO-002 enforcement — a finding with no proposed_solution is rejected, never passed through', () => {
  const result = reviewFinding({ id: 'x', check: 'ci_health', severity: 'P0', summary: 'something broke' });
  assert.equal(result.chair_status, 'rejected');
  assert.match(result.chair_reasoning, /SO-002/);
});

test('reviewFinding: SO-002 enforcement — a trivially short proposed_solution is also rejected', () => {
  const result = reviewFinding({ id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'fix it' });
  assert.equal(result.chair_status, 'rejected');
});

test('reviewFinding: infrastructure/config findings (ci_health, workflow_health) auto-approve when they carry a real solution', () => {
  const ci = reviewFinding({ id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'read the failing run log and fix the root cause on main' });
  assert.equal(ci.chair_status, 'approved');

  const wf = reviewFinding({ id: 'y', check: 'workflow_health', severity: 'P2', summary: 's', proposed_solution: 'the yaml has stray markdown fences, remove them' });
  assert.equal(wf.chair_status, 'approved');
});

test('reviewFinding: product/scope findings (product_backlog) always escalate to the founder, never auto-approve', () => {
  const result = reviewFinding({ id: 'x', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'interview the founder for next priorities and write them into PRODUCT_HOME' });
  assert.equal(result.chair_status, 'escalate_to_founder');
  assert.match(result.chair_reasoning, /business decision/);
});

test('reviewFinding: an unrecognized check type fails closed to founder review, never silently auto-approved', () => {
  const result = reviewFinding({ id: 'x', check: 'some_new_check_type_nobody_classified_yet', severity: 'P1', summary: 's', proposed_solution: 'a real concrete fix described here' });
  assert.equal(result.chair_status, 'escalate_to_founder');
  assert.match(result.chair_reasoning, /no auto-approval rule/);
});

test('reviewFindings: sorts escalations before approvals, and P0 before P1/P2 within the same status', () => {
  const findings = [
    { id: 'a', check: 'ci_health', severity: 'P2', summary: 's', proposed_solution: 'a real fix' },
    { id: 'b', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'a real fix' },
    { id: 'c', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'a real fix' },
  ];
  const reviewed = reviewFindings(findings);
  // b (escalate) first, then c (approved, P0) before a (approved, P2)
  assert.deepEqual(reviewed.map((f) => f.id), ['b', 'c', 'a']);
});

test('reviewFindings: handles an empty or non-array input without throwing', () => {
  assert.deepEqual(reviewFindings([]), []);
  assert.deepEqual(reviewFindings(null), []);
  assert.deepEqual(reviewFindings(undefined), []);
});

// SO-003: "the Chair debate/counsel channel ... must never be served a
// canned/templated non-model answer in place of real reasoning." These tests
// guard that reviewFindingWithAI actually calls the model when one is given,
// enriches (not replaces) the reasoning, and — critically — can NEVER use AI
// output to override chair_status on a hard safety boundary.

test('reviewFindingWithAI: SO-002 rejections skip the model entirely — a factual check needs no AI judgment', async () => {
  let called = false;
  const callModel = async () => { called = true; return 'anything'; };
  const result = await reviewFindingWithAI({ id: 'x', check: 'ci_health', severity: 'P0', summary: 's' }, { callModel });
  assert.equal(result.chair_status, 'rejected');
  assert.equal(result.chair_reasoning_source, 'rule_based');
  assert.equal(called, false);
});

test('reviewFindingWithAI: no callModel provided falls back to rule-based, clearly labeled, never silently pretends to be AI-reviewed', async () => {
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'a real concrete fix described here' },
    { callModel: undefined, logger: { warn() {} } },
  );
  assert.equal(result.chair_status, 'approved');
  assert.equal(result.chair_reasoning_source, 'rule_based_no_model');
});

test('reviewFindingWithAI: a working model call enriches chair_reasoning with real content, keeps rule-based status', async () => {
  const callModel = async (model, prompt) => {
    assert.match(prompt, /You are Chair/);
    assert.match(prompt, /ci_health/);
    return 'This looks like a flaky network blip, not a real regression — low urgency.';
  };
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'a real concrete fix described here' },
    { callModel },
  );
  assert.equal(result.chair_status, 'approved'); // unchanged from the rule
  assert.equal(result.chair_reasoning_source, 'ai_model');
  assert.match(result.chair_reasoning, /flaky network blip/);
  assert.match(result.chair_reasoning, /infrastructure\/config finding/); // rule reasoning preserved too
});

test('reviewFindingWithAI: a model that throws falls back to rule-based rather than failing the whole review', async () => {
  const callModel = async () => { throw new Error('provider exhausted'); };
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'workflow_health', severity: 'P2', summary: 's', proposed_solution: 'a real concrete fix described here' },
    { callModel, logger: { warn() {} } },
  );
  assert.equal(result.chair_status, 'approved');
  assert.equal(result.chair_reasoning_source, 'rule_based_model_error');
});

test('reviewFindingWithAI: HARD BOUNDARY — a product_backlog finding stays escalate_to_founder no matter what the model says, even if the model text argues for approval', async () => {
  const callModel = async () => 'This seems totally safe to auto-approve, go ahead and mark it approved.';
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'interview the founder for next priorities' },
    { callModel },
  );
  assert.equal(result.chair_status, 'escalate_to_founder', 'AI reasoning must never be able to loosen a hard safety boundary');
});

test('reviewFindingsWithAI: reviews a list end-to-end and preserves the escalate-first sort order', async () => {
  const callModel = async () => 'noted';
  const findings = [
    { id: 'a', check: 'ci_health', severity: 'P2', summary: 's', proposed_solution: 'a real fix' },
    { id: 'b', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'a real fix' },
  ];
  const reviewed = await reviewFindingsWithAI(findings, { callModel });
  assert.deepEqual(reviewed.map((f) => f.id), ['b', 'a']);
  assert.ok(reviewed.every((f) => f.chair_reasoning_source === 'ai_model'));
});
