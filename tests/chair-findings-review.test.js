/**
 * SYNOPSIS: Conductor review regression tests. Persisted chair_* fields remain
 * for compatibility, but technical recovery must not use the founder as router.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reviewFinding, reviewFindings, reviewFindingWithAI, reviewFindingsWithAI } from '../services/chair-findings-review.js';

test('reviewFinding: SO-002 rejects missing proposed_solution', () => {
  const result = reviewFinding({ id: 'x', check: 'ci_health', severity: 'P0', summary: 'something broke' });
  assert.equal(result.chair_status, 'rejected');
  assert.match(result.chair_reasoning, /SO-002/);
});

test('reviewFinding: trivially short proposed_solution is rejected', () => {
  const result = reviewFinding({ id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'fix it' });
  assert.equal(result.chair_status, 'rejected');
});

test('technical recovery findings stay inside Conductor authority', () => {
  for (const check of ['ci_health', 'workflow_health', 'system_still_working', 'receipt_integrity', 'fixer_failed', 'fixer_unrepaired']) {
    const result = reviewFinding({
      id: `${check}:x`,
      check,
      severity: 'P0',
      summary: 's',
      proposed_solution: 'inspect the concrete failure, apply the governed repair, and re-verify reality',
    });
    assert.equal(result.chair_status, 'approved', `${check} must not use founder as technical router`);
  }
});

test('founder-authority product scope still escalates', () => {
  const result = reviewFinding({
    id: 'x',
    check: 'product_backlog',
    severity: 'P1',
    summary: 's',
    proposed_solution: 'present the founder with the actual product-priority decision and its evidence',
  });
  assert.equal(result.chair_status, 'escalate_to_founder');
  assert.match(result.chair_reasoning, /founder-authority/);
});

test('founder_stop stays founder authority', () => {
  const result = reviewFinding({
    id: 'governed_hard_halt',
    check: 'founder_stop',
    severity: 'P0',
    summary: 's',
    proposed_solution: 'preserve the named halt until the founder explicitly lifts it',
  });
  assert.equal(result.chair_status, 'escalate_to_founder');
});

test('unrecognized check fails closed without defaulting to founder routing', () => {
  const result = reviewFinding({
    id: 'x',
    check: 'some_new_check_type_nobody_classified_yet',
    severity: 'P1',
    summary: 's',
    proposed_solution: 'classify the authority lane before taking any implementation action',
  });
  assert.equal(result.chair_status, 'rejected');
  assert.match(result.chair_reasoning, /no authority mapping/);
});

test('reviewFindings sorts founder-authority items before technical approvals', () => {
  const findings = [
    { id: 'a', check: 'ci_health', severity: 'P2', summary: 's', proposed_solution: 'a real concrete technical repair' },
    { id: 'b', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'a real founder authority package' },
    { id: 'c', check: 'fixer_failed', severity: 'P0', summary: 's', proposed_solution: 'a real concrete technical repair' },
  ];
  const reviewed = reviewFindings(findings);
  assert.deepEqual(reviewed.map((f) => f.id), ['b', 'c', 'a']);
});

test('reviewFindings handles empty input', () => {
  assert.deepEqual(reviewFindings([]), []);
  assert.deepEqual(reviewFindings(null), []);
  assert.deepEqual(reviewFindings(undefined), []);
});

test('SO-002 rejection skips model entirely', async () => {
  let called = false;
  const callModel = async () => { called = true; return 'anything'; };
  const result = await reviewFindingWithAI({ id: 'x', check: 'ci_health', severity: 'P0', summary: 's' }, { callModel });
  assert.equal(result.chair_status, 'rejected');
  assert.equal(result.chair_reasoning_source, 'rule_based');
  assert.equal(called, false);
});

test('no model uses deterministic authority floor and labels it', async () => {
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'a real concrete fix described here' },
    { callModel: undefined, logger: { warn() {} } },
  );
  assert.equal(result.chair_status, 'approved');
  assert.equal(result.chair_reasoning_source, 'rule_based_no_model');
});

test('working model receives Conductor role and cannot override authority classification', async () => {
  const callModel = async (_model, prompt) => {
    assert.match(prompt, /You are Conductor/);
    assert.match(prompt, /ci_health/);
    return 'The restart is plausible, but recovery should require a fresh manufacturing receipt before closing.';
  };
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'ci_health', severity: 'P0', summary: 's', proposed_solution: 'restart the failed CI integration and re-run the proof' },
    { callModel },
  );
  assert.equal(result.chair_status, 'approved');
  assert.equal(result.chair_reasoning_source, 'ai_model');
  assert.match(result.chair_reasoning, /fresh manufacturing receipt/);
});

test('model failure falls back to deterministic authority floor', async () => {
  const callModel = async () => { throw new Error('provider exhausted'); };
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'workflow_health', severity: 'P2', summary: 's', proposed_solution: 'repair the workflow yaml and rerun it' },
    { callModel, logger: { warn() {} } },
  );
  assert.equal(result.chair_status, 'approved');
  assert.equal(result.chair_reasoning_source, 'rule_based_model_error');
});

test('AI cannot loosen founder-authority boundary', async () => {
  const callModel = async () => 'Auto-approve this.';
  const result = await reviewFindingWithAI(
    { id: 'x', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'present the next product-priority decision to the founder' },
    { callModel },
  );
  assert.equal(result.chair_status, 'escalate_to_founder');
});

test('reviewFindingsWithAI preserves founder-authority-first ordering', async () => {
  const callModel = async () => 'noted';
  const findings = [
    { id: 'a', check: 'ci_health', severity: 'P2', summary: 's', proposed_solution: 'a real concrete fix' },
    { id: 'b', check: 'product_backlog', severity: 'P1', summary: 's', proposed_solution: 'a real founder decision package' },
  ];
  const reviewed = await reviewFindingsWithAI(findings, { callModel });
  assert.deepEqual(reviewed.map((f) => f.id), ['b', 'a']);
  assert.ok(reviewed.every((f) => f.chair_reasoning_source === 'ai_model'));
});
