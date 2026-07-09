/**
 * SYNOPSIS: Unit tests for mergeQueueRuntimeStatus — the loop must persist only
 * its runtime step fields onto the LATEST repo queue, never clobber a concurrent
 * spec/task edit with its stale in-container snapshot.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeQueueRuntimeStatus } from '../services/never-stop-product-factory.js';

test('preserves an external spec/task edit while applying runtime status', () => {
  // Repo has a freshly-edited task; loop's in-memory copy still has the old task
  // but a newer status (it just built the step).
  const repo = {
    product_id: 'site-builder',
    updated_at: '2026-01-01T00:00:00Z',
    steps: [
      { id: 'a', task: 'NEW edited task', spec: 'NEW spec', status: 'pending', attempts: 0 },
      { id: 'b', task: 'b task', status: 'done', attempts: 1 },
    ],
  };
  const mem = {
    product_id: 'site-builder',
    updated_at: '2026-01-02T00:00:00Z',
    steps: [
      { id: 'a', task: 'OLD task', spec: 'OLD spec', status: 'done', attempts: 2, commit_sha: 'abc1234', last_error: null },
      { id: 'b', task: 'b task', status: 'done', attempts: 1 },
    ],
  };
  const merged = mergeQueueRuntimeStatus(repo, mem);
  const a = merged.steps.find((s) => s.id === 'a');
  // Spec/task come from the repo (external edit preserved)…
  assert.equal(a.task, 'NEW edited task');
  assert.equal(a.spec, 'NEW spec');
  // …runtime status comes from the loop.
  assert.equal(a.status, 'done');
  assert.equal(a.attempts, 2);
  assert.equal(a.commit_sha, 'abc1234');
  // updated_at advances to the loop's value.
  assert.equal(merged.updated_at, '2026-01-02T00:00:00Z');
});

test('keeps repo step order and repo-only steps; appends mem-only steps', () => {
  const repo = { steps: [{ id: 'x', status: 'pending' }, { id: 'y', status: 'pending' }] };
  const mem = { steps: [{ id: 'y', status: 'done' }, { id: 'z', status: 'pending' }] };
  const merged = mergeQueueRuntimeStatus(repo, mem);
  assert.deepEqual(merged.steps.map((s) => s.id), ['x', 'y', 'z']);
  assert.equal(merged.steps.find((s) => s.id === 'x').status, 'pending'); // repo-only untouched
  assert.equal(merged.steps.find((s) => s.id === 'y').status, 'done'); // runtime applied
});

test('does not introduce runtime fields the mem step never had', () => {
  const repo = { steps: [{ id: 'a', task: 't', status: 'pending' }] };
  const mem = { steps: [{ id: 'a', status: 'done' }] };
  const merged = mergeQueueRuntimeStatus(repo, mem);
  const a = merged.steps.find((s) => s.id === 'a');
  assert.equal(a.status, 'done');
  assert.equal(a.task, 't');
  assert.equal(Object.prototype.hasOwnProperty.call(a, 'commit_sha'), false);
});

test('falls back to the in-memory queue when repo copy is unusable', () => {
  const mem = { steps: [{ id: 'a', status: 'done' }] };
  assert.equal(mergeQueueRuntimeStatus(null, mem), mem);
  assert.equal(mergeQueueRuntimeStatus({ notsteps: true }, mem), mem);
});

test('never downgrades a repo done step to stale mem pending', () => {
  const repo = {
    steps: [
      { id: 's2', status: 'done', attempts: 1, commit_sha: 'abc', completed_at: '2026-07-09T12:00:00Z' },
      { id: 's3', status: 'pending', attempts: 0 },
    ],
  };
  const mem = {
    steps: [
      { id: 's2', status: 'pending', attempts: 0, last_error: 'verify_exit_1' },
      { id: 's3', status: 'pending', attempts: 0 },
    ],
  };
  const merged = mergeQueueRuntimeStatus(repo, mem);
  const s2 = merged.steps.find((s) => s.id === 's2');
  assert.equal(s2.status, 'done');
  assert.equal(s2.commit_sha, 'abc');
  assert.equal(s2.attempts, 1);
});
