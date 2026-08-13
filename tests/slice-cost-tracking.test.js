/**
 * SYNOPSIS: Hard-gate — every built slice must stamp duration_ms + tokens_used.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLICE_COST_UNTRACKED,
  stampSliceCost,
  assertSliceCostTracked,
  requireSliceCostTracked,
  summarizeQueueSliceCosts,
  extractTokenUsage,
} from '../services/slice-cost-tracking.js';

test('extractTokenUsage accepts codegen usage and 0 for exact ships', () => {
  assert.equal(extractTokenUsage({ usage: { total_tokens: 120 } }), 120);
  assert.equal(extractTokenUsage({ prompt_tokens: 10, completion_tokens: 5 }), 15);
  assert.equal(extractTokenUsage({ no_codegen: true }), 0);
  assert.equal(extractTokenUsage({ action_type: 'write_file_exact' }), 0);
  assert.equal(extractTokenUsage({}), null);
});

test('requireSliceCostTracked stamps wall clock from started_at', () => {
  const step = { started_at: new Date(Date.now() - 1500).toISOString() };
  const gate = requireSliceCostTracked(step, { usage: { total_tokens: 42 } });
  assert.equal(gate.ok, true);
  assert.ok(step.duration_ms >= 1000);
  assert.equal(step.tokens_used, 42);
});

test('assertSliceCostTracked fails closed without tokens', () => {
  const step = { duration_ms: 10 };
  stampSliceCost(step, {});
  const gate = assertSliceCostTracked(step);
  assert.equal(gate.ok, false);
  assert.match(gate.reason, new RegExp(SLICE_COST_UNTRACKED));
});

test('author_then_write without usage cannot mark DONE (no silent 0 tokens)', () => {
  const step = {
    id: 'S1',
    action_type: 'author_then_write',
    started_at: new Date(Date.now() - 500).toISOString(),
  };
  const gate = requireSliceCostTracked(step, { action_type: 'author_then_write' });
  assert.equal(gate.ok, false);
  assert.match(gate.reason, /tokens_used/);
});

test('write_file_exact may record 0 tokens', () => {
  const step = {
    action_type: 'write_file_exact',
    started_at: new Date(Date.now() - 200).toISOString(),
  };
  const gate = requireSliceCostTracked(step, { action_type: 'write_file_exact', no_codegen: true });
  assert.equal(gate.ok, true);
  assert.equal(step.tokens_used, 0);
});

test('summarizeQueueSliceCosts scores tracked vs untracked done slices', () => {
  const report = summarizeQueueSliceCosts({
    product_id: 'universal-overlay',
    steps: [
      { id: 'a', status: 'done', duration_ms: 1000, tokens_used: 50, shipped_at: '2026-08-13T00:00:00Z' },
      { id: 'b', status: 'done', shipped_at: '2026-08-13T00:01:00Z' },
      { id: 'c', status: 'pending' },
    ],
  });
  assert.equal(report.done_total, 2);
  assert.equal(report.tracked_done, 1);
  assert.equal(report.untracked_done, 1);
  assert.deepEqual(report.untracked_ids, ['b']);
  assert.equal(report.total_tokens_used, 50);
});
