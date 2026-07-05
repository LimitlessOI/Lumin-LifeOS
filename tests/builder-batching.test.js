/**
 * SYNOPSIS: tests/builder-batching.test.js — unit tests for concurrency-safe batch planning.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { planBatches } from '../scripts/autonomy/builder-batching.mjs';

const ids = (batches) => batches.map((b) => b.map((s) => s.id));

test('respects maxConcurrent when no files overlap', () => {
  const segs = [
    { id: 1, allowed_files: ['a.js'] },
    { id: 2, allowed_files: ['b.js'] },
    { id: 3, allowed_files: ['c.js'] },
    { id: 4, allowed_files: ['d.js'] },
  ];
  assert.deepEqual(ids(planBatches(segs, 3)), [[1, 2, 3], [4]]);
});

test('never puts two overlapping-file segments in the same batch', () => {
  const segs = [
    { id: 1, allowed_files: ['shared.js'] },
    { id: 2, allowed_files: ['shared.js'] },
    { id: 3, allowed_files: ['other.js'] },
  ];
  const batches = planBatches(segs, 3);
  // seg 1 and 3 can share (disjoint); seg 2 conflicts with 1 → next batch
  assert.deepEqual(ids(batches), [[1, 3], [2]]);
  for (const batch of batches) {
    const claimed = new Set();
    for (const s of batch) for (const f of s.allowed_files) {
      assert.ok(!claimed.has(f), `no file collision within a batch: ${f}`);
      claimed.add(f);
    }
  }
});

test('every input segment appears exactly once', () => {
  const segs = Array.from({ length: 10 }, (_, i) => ({ id: i, allowed_files: [`f${i % 3}.js`] }));
  const flat = planBatches(segs, 3).flat().map((s) => s.id).sort((a, b) => a - b);
  assert.deepEqual(flat, segs.map((s) => s.id));
});

test('segments with empty file scope never block a batch', () => {
  const segs = [
    { id: 1, allowed_files: [] },
    { id: 2, allowed_files: [] },
    { id: 3, allowed_files: [] },
  ];
  assert.deepEqual(ids(planBatches(segs, 2)), [[1, 2], [3]]);
});

test('maxConcurrent below 1 is coerced to 1', () => {
  const segs = [{ id: 1, allowed_files: ['a'] }, { id: 2, allowed_files: ['b'] }];
  assert.deepEqual(ids(planBatches(segs, 0)), [[1], [2]]);
});
