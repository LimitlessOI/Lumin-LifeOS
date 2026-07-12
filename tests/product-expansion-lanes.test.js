/**
 * SYNOPSIS: Multiple-lane concurrency — the factory builds several products'
 * next steps in parallel (bounded), not one task per cycle.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapConcurrent, runProductExpansionLanes, defaultPlannerCallModel, dailyBuildBudget, productRankFraction, loadProductPriority } from '../services/never-stop-product-factory.js';

test('defaultPlannerCallModel is fail-closed only when NO strong provider key is present', () => {
  // Founder directive: never idle on token exhaustion — fail over across every
  // present strong provider. So it returns a callable if ANY provider key exists,
  // and null only when all are absent.
  const keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    assert.equal(defaultPlannerCallModel(), null, 'null when no provider key at all');

    process.env.OPENAI_API_KEY = 'test-openai';
    assert.equal(typeof defaultPlannerCallModel(), 'function', 'callable via OpenAI failover even with no Anthropic key');
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
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

test('productRankFraction: listed products sort first, in founder order', () => {
  const list = ['site-builder', 'marketingos'];
  const sb = productRankFraction('site-builder', list);
  const mos = productRankFraction('marketingos', list);
  assert.equal(sb, 0);
  assert.ok(mos > sb, 'later-listed product ranks after earlier-listed');
  assert.ok(mos < 0.01, 'listed products stay well below unlisted range');
});

test('productRankFraction: unlisted always sort after listed, more mature first', () => {
  const list = ['site-builder'];
  const listedMax = productRankFraction('site-builder', list);
  const unlistedThin = productRankFraction('faith-studio', list, 0);
  const unlistedRich = productRankFraction('lifeos', list, 40);
  assert.ok(unlistedThin > listedMax, 'unlisted ranks after any listed product');
  assert.ok(unlistedRich < unlistedThin, 'more documented backlog builds sooner');
  assert.ok(unlistedRich >= 0.01, 'never crosses into the listed range');
});

test('loadProductPriority reads the founder-owned list and includes lifeos first', () => {
  const list = loadProductPriority();
  assert.ok(Array.isArray(list));
  assert.equal(list[0], 'lifeos');
  assert.ok(list.includes('site-builder'));
});

test('dailyBuildBudget: cap=0 disables the guardrail (unlimited)', () => {
  const saved = process.env.NEVER_STOP_DAILY_STEP_CAP;
  process.env.NEVER_STOP_DAILY_STEP_CAP = '0';
  try {
    const b = dailyBuildBudget();
    assert.equal(b.ok, true);
    assert.equal(b.unlimited, true);
    assert.equal(b.remaining, Infinity);
  } finally {
    if (saved === undefined) delete process.env.NEVER_STOP_DAILY_STEP_CAP;
    else process.env.NEVER_STOP_DAILY_STEP_CAP = saved;
  }
});

test('dailyBuildBudget: positive cap reports a finite remaining ceiling', () => {
  const saved = process.env.NEVER_STOP_DAILY_STEP_CAP;
  process.env.NEVER_STOP_DAILY_STEP_CAP = '60';
  try {
    const b = dailyBuildBudget();
    assert.equal(b.cap, 60);
    assert.ok(b.remaining <= 60 && b.remaining >= 0);
    assert.equal(b.ok, b.remaining > 0);
  } finally {
    if (saved === undefined) delete process.env.NEVER_STOP_DAILY_STEP_CAP;
    else process.env.NEVER_STOP_DAILY_STEP_CAP = saved;
  }
});
