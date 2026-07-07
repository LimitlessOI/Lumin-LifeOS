/**
 * SYNOPSIS: Functional-proof completion gate + self-diagnosis carry-forward.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Proves the "false done" class is closed: a route step that built + verified +
 * deployed live is STILL not `done` unless its module actually loaded + mounted
 * on that deploy (read from the boot module-health manifest). On failure the step
 * stays retryable and the VERBATIM mount error is carried into step.last_error so
 * the next build attempt repairs the root cause. Non-route targets pass through.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQueue,
  runNextStep,
  evaluateModuleHealthForStep,
  STEP_STATUS,
} from '../services/product-build-orchestrator.js';

function makeQueue(steps) {
  return normalizeQueue({ schema: 'product_build_queue_v1', product_id: 'test', steps });
}
const passBuild = async () => ({ ok: true, commit_sha: 'abc123' });
const passVerify = async () => ({ ok: true });
const passDeploy = async () => ({ ok: true });

test('evaluateModuleHealthForStep: non-route target is not applicable (passes through)', () => {
  for (const t of ['db/migrations/x.sql', 'services/marketing-coach.js', 'config/x.json', '']) {
    const r = evaluateModuleHealthForStep({ modules: [] }, t);
    assert.equal(r.ok, true);
    assert.equal(r.applicable, false);
  }
});

test('evaluateModuleHealthForStep: route mounted = proven; error / missing = not proven with verbatim reason', () => {
  const target = 'routes/marketing-session-routes.js';
  const mounted = evaluateModuleHealthForStep({ modules: [{ module: target, status: 'mounted' }] }, target);
  assert.deepEqual([mounted.ok, mounted.applicable], [true, true]);

  const errored = evaluateModuleHealthForStep(
    { modules: [{ module: target, status: 'error', error: "Cannot find module './ai-council.js'" }] },
    target,
  );
  assert.equal(errored.ok, false);
  assert.match(errored.reason, /module_not_mounted/);
  assert.match(errored.reason, /ai-council/); // verbatim error surfaced for repair

  const missing = evaluateModuleHealthForStep({ modules: [] }, target);
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /not auto-registered/);
  assert.match(missing.reason, /auto-registered-product-modules\.json/); // actionable fix
});

test('runNextStep: route step is NOT done when module did not mount — stays retryable + carries verbatim error', async () => {
  const q = makeQueue([{ id: 'r', target_file: 'routes/marketing-session-routes.js', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: passBuild,
    verifyFn: passVerify,
    deployProofFn: passDeploy, // built + verified + deployed live...
    moduleHealthFn: async () => ({ ok: false, reason: "module_not_mounted (routes/marketing-session-routes.js): Cannot find module './ai-council.js'" }),
    maxAttempts: 3,
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'functional_proof');
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING, 'retryable, not done, not blocked yet');
  assert.match(q.steps[0].last_error, /ai-council/, 'verbatim error fed back for self-repair');
  assert.notEqual(q.steps[0].status, STEP_STATUS.DONE);
});

test('runNextStep: route step IS done when module mounts (functional_proven=true)', async () => {
  const q = makeQueue([{ id: 'r', target_file: 'routes/marketing-session-routes.js', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: passBuild,
    verifyFn: passVerify,
    deployProofFn: passDeploy,
    moduleHealthFn: async () => ({ ok: true, reason: 'module_mounted' }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.functional_proven, true);
  assert.equal(q.steps[0].status, STEP_STATUS.DONE);
  assert.equal(q.steps[0].functional_proven, true);
});

test('runNextStep: non-route step is unaffected by the functional-proof gate', async () => {
  const q = makeQueue([{ id: 's', target_file: 'db/migrations/x.sql', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: passBuild,
    verifyFn: passVerify,
    deployProofFn: passDeploy,
    // moduleHealthFn returns pass-through for non-route targets in the real factory;
    // here we assert the gate wiring doesn't block a migration step.
    moduleHealthFn: async ({ step }) => evaluateModuleHealthForStep({ modules: [] }, step.target_file),
  });
  assert.equal(r.ok, true);
  assert.equal(q.steps[0].status, STEP_STATUS.DONE);
});

test('runNextStep: repeated functional-proof failures eventually BLOCK (no infinite spin)', async () => {
  const q = makeQueue([{ id: 'r', target_file: 'routes/x.js', task: 't' }]);
  const opts = {
    buildFn: passBuild,
    verifyFn: passVerify,
    deployProofFn: passDeploy,
    moduleHealthFn: async () => ({ ok: false, reason: 'module_not_mounted (routes/x.js): boom' }),
    maxAttempts: 2,
  };
  await runNextStep(q, opts);
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING);
  await runNextStep(q, opts);
  assert.equal(q.steps[0].status, STEP_STATUS.BLOCKED, 'blocked after maxAttempts — loop moves on');
});
