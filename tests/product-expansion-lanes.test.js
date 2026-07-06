/**
 * SYNOPSIS: Multiple-lane concurrency — the factory builds several products'
 * next steps in parallel (bounded), not one task per cycle.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapConcurrent, runProductExpansionLanes, defaultPlannerCallModel } from '../services/never-stop-product-factory.js';

test('defaultPlannerCallModel is fail-closed when no paid key is present', () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.equal(defaultPlannerCallModel(), null);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('mapConcurrent respects the concurrency ceiling and preserves order', async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 7 }, (_, i) => i);
  const out = await mapConcurrent(items, 3, async (n) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight -= 1;
    return n * 2;
  });
  assert.equal(peak <= 3, true, `peak concurrency ${peak} exceeded ceiling`);
  assert.deepEqual(out, items.map((n) => n * 2));
});

test('runProductExpansionLanes builds every discovered lane concurrently', async () => {
  const work = [
    { id: 'product_build_a_s1', product_id: 'a', step_id: 's1' },
    { id: 'product_build_b_s1', product_id: 'b', step_id: 's1' },
    { id: 'product_build_c_s1', product_id: 'c', step_id: 's1' },
  ];
  const seen = [];
  const res = await runProductExpansionLanes({
    concurrency: 2,
    discoverFn: () => work,
    laneStepFn: async (task) => {
      seen.push(task.product_id);
      return { ok: true, outcome: { commit_sha: `sha_${task.product_id}`, deploy_proven: true } };
    },
    logger: { info() {}, warn() {} },
  });
  assert.equal(res.lanes, 3);
  assert.equal(res.built, 3);
  assert.equal(res.live, 3);
  assert.deepEqual(seen.sort(), ['a', 'b', 'c']);
});

test('runProductExpansionLanes returns cleanly when no build-queue work exists', async () => {
  const res = await runProductExpansionLanes({ discoverFn: () => [], laneStepFn: async () => ({}) });
  assert.equal(res.ok, true);
  assert.equal(res.lanes, 0);
  assert.equal(res.detail, 'no_build_queue_work');
});

test('a failing lane never counts as built or live (no false green)', async () => {
  const work = [
    { id: 'p_ok', product_id: 'ok', step_id: 's1' },
    { id: 'p_bad', product_id: 'bad', step_id: 's1' },
  ];
  const res = await runProductExpansionLanes({
    discoverFn: () => work,
    laneStepFn: async (task) => (task.product_id === 'ok'
      ? { ok: true, outcome: { commit_sha: 'sha_ok', deploy_proven: true } }
      : { ok: false, outcome: { commit_sha: null } }),
    logger: { info() {}, warn() {} },
  });
  assert.equal(res.built, 1);
  assert.equal(res.live, 1);
});
