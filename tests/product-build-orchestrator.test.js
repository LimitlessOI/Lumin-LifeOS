/**
 * SYNOPSIS: js — tests/product-build-orchestrator.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQueue,
  selectNextStep,
  runNextStep,
  queueSummary,
  reviveStaleBlockedSteps,
  STEP_STATUS,
} from '../services/product-build-orchestrator.js';

function makeQueue(steps) {
  return normalizeQueue({ schema: 'product_build_queue_v1', product_id: 'test', verify_script: 'scripts/noop.mjs', steps });
}

test('normalizeQueue rejects bad schema and missing fields', () => {
  assert.throws(() => normalizeQueue({ schema: 'nope', steps: [] }));
  assert.throws(() => normalizeQueue({ schema: 'product_build_queue_v1', steps: [{ task: 'x', target_file: 'y' }] }), /needs an id/);
  assert.throws(() => normalizeQueue({ schema: 'product_build_queue_v1', steps: [{ id: 'a', task: 't' }] }), /target_file/);
  assert.throws(() => normalizeQueue({ schema: 'product_build_queue_v1', steps: [{ id: 'a', target_file: 'f' }] }), /task/);
  assert.throws(() => normalizeQueue({ schema: 'product_build_queue_v1', steps: [
    { id: 'a', target_file: 'f', task: 't' }, { id: 'a', target_file: 'g', task: 'u' },
  ] }), /duplicate/);
});

test('selectNextStep skips founder-gated and respects depends_on', () => {
  const q = makeQueue([
    { id: 'gated', target_file: 'f', task: 't', founder_gated: true },
    { id: 'b', target_file: 'f2', task: 't2', depends_on: ['a'] },
    { id: 'a', target_file: 'f1', task: 't1' },
  ]);
  const first = selectNextStep(q);
  assert.equal(first.step.id, 'a', 'a has no deps, comes before b which depends on a');
  assert.deepEqual(first.gated.map((g) => g.id), ['gated']);

  q.steps.find((s) => s.id === 'a').status = STEP_STATUS.DONE;
  assert.equal(selectNextStep(q).step.id, 'b', 'b unblocks once a is done');
});

test('runNextStep marks done only when build has SHA AND verify passes AND deploy-truth passes', async () => {
  const q = makeQueue([{ id: 'a', target_file: 'f', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: async () => ({ ok: true, commit_sha: 'abc123' }),
    verifyFn: async () => ({ ok: true }),
    deployProofFn: async () => ({ ok: true }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.verified, true);
  assert.equal(r.deploy_proven, true);
  assert.equal(q.steps[0].status, STEP_STATUS.DONE);
  assert.equal(q.steps[0].commit_sha, 'abc123');
});

test('missing deployProofFn cannot mark done (BUILT_NOT_LIVE — Wave 0 #10)', async () => {
  const q = makeQueue([{ id: 'a', target_file: 'f', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: async () => ({ ok: true, commit_sha: 'abc123' }),
    verifyFn: async () => ({ ok: true }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'deploy');
  assert.equal(r.claim_level, 'BUILT_NOT_LIVE');
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING);
});

test('build that claims ok but returns no SHA is treated as failure (no false green)', async () => {
  const q = makeQueue([{ id: 'a', target_file: 'f', task: 't' }]);
  const r = await runNextStep(q, {
    buildFn: async () => ({ ok: true }), // no commit_sha
    verifyFn: async () => ({ ok: true }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'build');
  assert.match(r.reason, /no_commit_sha/);
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING, 'retryable, not done');
});

test('deployProofFn gates "live": step stays retryable until the deploy serves the built SHA (no false live)', async () => {
  const q = makeQueue([{ id: 'a', target_file: 'f', task: 't' }]);
  const base = {
    buildFn: async () => ({ ok: true, commit_sha: 'abc123' }),
    verifyFn: async () => ({ ok: true }),
    maxAttempts: 3,
  };

  // deploy has not caught up yet -> not done, retryable
  let r = await runNextStep(q, { ...base, deployProofFn: async () => ({ ok: false, reason: 'deploy_serves_different_sha' }) });
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'deploy');
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING, 'retryable — build+verify passed but not live');

  // deploy now serves the built sha -> done + deploy_proven
  r = await runNextStep(q, { ...base, deployProofFn: async () => ({ ok: true }) });
  assert.equal(r.ok, true);
  assert.equal(r.deploy_proven, true);
  assert.equal(q.steps[0].status, STEP_STATUS.DONE);
});

test('verify failure keeps step retryable then blocks after maxAttempts (no spin)', async () => {
  const q = makeQueue([{ id: 'a', target_file: 'f', task: 't' }]);
  const opts = {
    buildFn: async () => ({ ok: true, commit_sha: 'sha' }),
    verifyFn: async () => ({ ok: false, detail: 'tests red' }),
    maxAttempts: 2,
  };
  let r = await runNextStep(q, opts);
  assert.equal(r.ok, false);
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING);
  r = await runNextStep(q, opts);
  assert.equal(r.blocked, true);
  assert.equal(q.steps[0].status, STEP_STATUS.BLOCKED, 'blocked after 2 attempts — loop moves on');
});

test('done queue surfaces founder-gated ids as awaiting_founder', async () => {
  const q = makeQueue([
    { id: 'a', target_file: 'f', task: 't', status: STEP_STATUS.DONE },
    { id: 'g', target_file: 'f2', task: 't2', founder_gated: true },
  ]);
  const r = await runNextStep(q, { buildFn: async () => ({ ok: true, commit_sha: 'x' }) });
  assert.equal(r.done, true);
  assert.deepEqual(r.awaiting_founder, ['g']);
});

test('queueSummary counts by status', () => {
  const q = makeQueue([
    { id: 'a', target_file: 'f', task: 't', status: STEP_STATUS.DONE },
    { id: 'b', target_file: 'f', task: 't' },
    { id: 'c', target_file: 'f', task: 't', founder_gated: true },
  ]);
  const s = queueSummary(q);
  assert.equal(s.total, 3);
  assert.equal(s.done, 1);
  assert.equal(s.pending, 1);
  assert.equal(s.founder_gated, 1);
  assert.equal(s.complete, false);
});

test('reviveStaleBlockedSteps revives blocked steps past cooldown, bounded, never founder-gated', () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const fresh = new Date().toISOString();
  const q = makeQueue([
    { id: 'stale', target_file: 'f1', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old },
    { id: 'recent', target_file: 'f2', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: fresh },
    { id: 'gated', target_file: 'f3', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old, founder_gated: true },
    { id: 'exhausted', target_file: 'f4', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old, revive_count: 6 },
    { id: 'done', target_file: 'f5', task: 't', status: STEP_STATUS.DONE },
  ]);
  const revived = reviveStaleBlockedSteps(q);
  assert.deepEqual(revived, ['stale'], 'only the stale, non-gated, non-exhausted blocked step revives');
  const stale = q.steps.find((s) => s.id === 'stale');
  assert.equal(stale.status, STEP_STATUS.PENDING);
  assert.equal(stale.attempts, 0, 'attempts reset so it gets a fresh maxAttempts window');
  assert.equal(stale.revive_count, 1);
  assert.equal(q.steps.find((s) => s.id === 'recent').status, STEP_STATUS.BLOCKED, 'within cooldown stays blocked');
  assert.equal(q.steps.find((s) => s.id === 'gated').status, STEP_STATUS.BLOCKED, 'founder-gated never auto-revives');
  assert.equal(q.steps.find((s) => s.id === 'exhausted').status, STEP_STATUS.BLOCKED, 'revive cap respected');
});

test('reviveStaleBlockedSteps makes a blocked step selectable again', () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const q = makeQueue([
    { id: 'a', target_file: 'f1', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old },
    { id: 'b', target_file: 'f2', task: 't', depends_on: ['a'] },
  ]);
  assert.equal(selectNextStep(q).step, null, 'blocked a strands dependent b');
  reviveStaleBlockedSteps(q);
  assert.equal(selectNextStep(q).step.id, 'a', 'revived a is selectable');
});

test('auto-register config step can run when route dep is blocked only for missing auto-register (chicken-egg)', () => {
  const q = makeQueue([
    {
      id: 'route',
      target_file: 'routes/lifeos-phase2-routes.js',
      task: 't',
      status: STEP_STATUS.BLOCKED,
      last_error: 'route module not auto-registered — add to config/auto-registered-product-modules.json',
      revive_count: 6,
    },
    {
      id: 'reg',
      target_file: 'config/auto-registered-product-modules.json',
      task: 'register',
      depends_on: ['route'],
    },
  ]);
  assert.equal(selectNextStep(q).step.id, 'reg', 'register step unblocks despite blocked route dep');
});
