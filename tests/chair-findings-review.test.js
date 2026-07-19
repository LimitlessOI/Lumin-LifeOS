/**
 * SYNOPSIS: js — tests/chair-findings-review.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reviewFinding, reviewFindings } from '../services/chair-findings-review.js';

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
