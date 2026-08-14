/**
 * SYNOPSIS: markShippedStepsDone must not mark a routes/*.js step DONE unless
 * the boot module-health manifest confirms it actually mounted LIVE.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Closes the exact class of bug found live 2026-08-14: Collectibles shipped
 * 46/46 steps "done", including routes/collectibles-routes.js, while
 * registerCollectiblesRoutes was never called anywhere in server startup --
 * GET /api/v1/collectibles returned a live 404. The other completion pathway
 * (product-build-orchestrator.js's runNextStep) already had this check; the
 * governed-ship pathway used in production never called it at all.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { markShippedStepsDone } from '../services/governed-autonomous-shipping-loop.js';

const USAGE = { S1: { tokens_used: 0, duration_ms: 1000, exact: true, no_codegen: true } };

function makeQueue(steps, { persistable = false } = {}) {
  const queue = { schema: 'product_build_queue_v1', product_id: 'test', steps };
  if (persistable) {
    // persistQueue() hard-refuses to CREATE a new BUILD_QUEUE.json path (by
    // design -- there is exactly one live queue). Point _sourcePath at a
    // real, already-existing tmp file so the success-path tests can reach
    // real persistence without tripping that guard or touching the real
    // docs/products/universal-overlay/BUILD_QUEUE.json.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mark-shipped-steps-done-'));
    const file = path.join(dir, 'BUILD_QUEUE.json');
    fs.writeFileSync(file, JSON.stringify(queue));
    queue._sourcePath = file;
  }
  return queue;
}

test('markShippedStepsDone: refuses DONE for a route step never mounted (the Collectibles class of bug)', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ modules: [] }), // route never in the manifest -- exactly the Collectibles state
  });

  const queue = makeQueue([{
    id: 'S1',
    status: 'building',
    target_file: 'routes/collectibles-routes.js',
    action_type: 'write_file_exact',
  }]);

  const marked = await markShippedStepsDone(queue, ['S1'], 'sha123', USAGE);
  assert.equal(marked.untracked.length, 1);
  assert.equal(marked.untracked[0].id, 'S1');
  assert.match(marked.untracked[0].reason, /not auto-registered/);
  assert.notEqual(queue.steps[0].status, 'done');
});

test('markShippedStepsDone: marks DONE when the module health manifest confirms it mounted', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ modules: [{ module: 'routes/collectibles-routes.js', status: 'mounted' }] }),
  });

  const queue = makeQueue([{
    id: 'S1',
    status: 'building',
    target_file: 'routes/collectibles-routes.js',
    action_type: 'write_file_exact',
  }], { persistable: true });

  const marked = await markShippedStepsDone(queue, ['S1'], 'sha123', USAGE);
  assert.equal(marked.untracked.length, 0);
  assert.equal(queue.steps[0].status, 'done');
  assert.equal(queue.steps[0].functional_proven, true);
});

test('markShippedStepsDone: non-route targets are unaffected and never fetch module-health', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({ modules: [] }) }; };

  const queue = makeQueue([{
    id: 'S1',
    status: 'building',
    target_file: 'services/collectibles/twin-store.js',
    action_type: 'write_file_exact',
  }], { persistable: true });

  const marked = await markShippedStepsDone(queue, ['S1'], 'sha123', USAGE);
  assert.equal(marked.untracked.length, 0);
  assert.equal(queue.steps[0].status, 'done');
  assert.equal(fetchCalled, false, 'service targets should not need a module-health fetch');
});

test('markShippedStepsDone: module-health fetch failure fails closed, not silently done', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { throw new Error('network down'); };

  const queue = makeQueue([{
    id: 'S1',
    status: 'building',
    target_file: 'routes/collectibles-routes.js',
    action_type: 'write_file_exact',
  }]);

  const marked = await markShippedStepsDone(queue, ['S1'], 'sha123', USAGE);
  assert.equal(marked.untracked.length, 1);
  assert.notEqual(queue.steps[0].status, 'done');
});
