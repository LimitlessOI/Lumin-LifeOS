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
  evaluateStepExpectations,
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

test('selectNextStep skips human_hold only; ships design_review_flagged and legacy founder_gated', () => {
  const q = makeQueue([
    { id: 'a', target_file: 'f1', task: 't1' },
    { id: 'b', target_file: 'f2', task: 't2', depends_on: ['a'] },
    { id: 'ui', target_file: 'public/overlay/x.html', task: 'panel', design_review_flagged: true },
    { id: 'hold', target_file: 'f', task: 't', human_hold: true, status: STEP_STATUS.FOUNDER_GATED, founder_gated: true },
  ]);
  const first = selectNextStep(q);
  assert.equal(first.step.id, 'a', 'a has no deps, comes before b which depends on a');
  assert.deepEqual(first.gated.map((g) => g.id), ['hold']);

  q.steps.find((s) => s.id === 'a').status = STEP_STATUS.DONE;
  const second = selectNextStep(q);
  assert.equal(second.step.id, 'b', 'b unblocks once a is done');
  assert.deepEqual(second.gated.map((g) => g.id), ['hold']);

  q.steps.find((s) => s.id === 'b').status = STEP_STATUS.DONE;
  const third = selectNextStep(q);
  assert.equal(third.step.id, 'ui', 'design_review_flagged UI ships without human hold');
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

test('done queue surfaces human_hold ids as awaiting_founder', async () => {
  const q = makeQueue([
    { id: 'a', target_file: 'f', task: 't', status: STEP_STATUS.DONE },
    { id: 'g', target_file: 'f2', task: 't2', human_hold: true, status: STEP_STATUS.FOUNDER_GATED, founder_gated: true },
  ]);
  const r = await runNextStep(q, { buildFn: async () => ({ ok: true, commit_sha: 'x' }) });
  assert.equal(r.done, true);
  assert.deepEqual(r.awaiting_founder, ['g']);
});

test('queueSummary counts by status including design_review_flagged and human_hold', () => {
  const q = makeQueue([
    { id: 'a', target_file: 'f', task: 't', status: STEP_STATUS.DONE },
    { id: 'b', target_file: 'f', task: 't' },
    { id: 'ui', target_file: 'public/overlay/x.html', task: 'panel', design_review_flagged: true },
    { id: 'c', target_file: 'f', task: 't', human_hold: true, status: STEP_STATUS.FOUNDER_GATED, founder_gated: true },
  ]);
  const s = queueSummary(q);
  assert.equal(s.total, 4);
  assert.equal(s.done, 1);
  assert.equal(s.pending, 1);
  assert.equal(s.design_review_flagged, 1);
  assert.equal(s.human_hold, 1);
  assert.equal(s.founder_gated, 1);
  assert.equal(s.complete, false);
});

test('reviveStaleBlockedSteps revives blocked steps past cooldown, bounded, never human_hold', () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const fresh = new Date().toISOString();
  const q = makeQueue([
    { id: 'stale', target_file: 'f1', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old },
    { id: 'recent', target_file: 'f2', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: fresh },
    { id: 'hold', target_file: 'f3', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old, human_hold: true, founder_gated: true },
    { id: 'exhausted', target_file: 'f4', task: 't', status: STEP_STATUS.BLOCKED, attempts: 3, last_attempt_at: old, revive_count: 6 },
    { id: 'done', target_file: 'f5', task: 't', status: STEP_STATUS.DONE },
  ]);
  const revived = reviveStaleBlockedSteps(q);
  assert.deepEqual(revived, ['stale'], 'only the stale, non-hold, non-exhausted blocked step revives');
  const stale = q.steps.find((s) => s.id === 'stale');
  assert.equal(stale.status, STEP_STATUS.PENDING);
  assert.equal(stale.attempts, 0, 'attempts reset so it gets a fresh maxAttempts window');
  assert.equal(stale.revive_count, 1);
  assert.equal(q.steps.find((s) => s.id === 'recent').status, STEP_STATUS.BLOCKED, 'within cooldown stays blocked');
  assert.equal(q.steps.find((s) => s.id === 'hold').status, STEP_STATUS.BLOCKED, 'human_hold never auto-revives');
  assert.equal(q.steps.find((s) => s.id === 'exhausted').status, STEP_STATUS.SKIPPED, 'revive cap demotes to skipped');
  assert.equal(q.steps.find((s) => s.id === 'exhausted').demoted, true);
});

test('reviveStaleBlockedSteps does not unlock auto-reg route via unrelated register DONE', () => {
  const q = makeQueue([
    {
      id: 'route-a',
      target_file: 'routes/a.js',
      task: 't',
      status: STEP_STATUS.BLOCKED,
      last_error: 'route module not auto-registered',
      revive_count: 0,
      last_attempt_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'reg-other',
      target_file: 'config/auto-registered-product-modules.json',
      task: 'register other',
      depends_on: ['route-other'],
      status: STEP_STATUS.DONE,
    },
  ]);
  const revived = reviveStaleBlockedSteps(q);
  assert.deepEqual(revived, []);
  assert.equal(q.steps.find((s) => s.id === 'route-a').status, STEP_STATUS.BLOCKED);
});

test('selectNextStep prefers pending blueprint step over earlier blocked thrash', () => {
  const q = makeQueue([
    {
      id: 'blocked-route',
      target_file: 'routes/x.js',
      task: 't',
      status: STEP_STATUS.BLOCKED,
      last_error: 'route module not auto-registered',
    },
    { id: 'pending-script', target_file: 'scripts/y.mjs', task: 't2', status: STEP_STATUS.PENDING },
  ]);
  assert.equal(selectNextStep(q).step.id, 'pending-script');
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

test('auto-register config step can run when route dep is PENDING with commit_sha + auto-reg error', () => {
  const q = makeQueue([
    {
      id: 'route',
      target_file: 'routes/lifeos-consent-routes.js',
      task: 't',
      status: STEP_STATUS.PENDING,
      commit_sha: 'abc123',
      last_error: 'route module not auto-registered — add to config/auto-registered-product-modules.json',
      attempts: 1,
    },
    {
      id: 'reg',
      target_file: 'config/auto-registered-product-modules.json',
      task: 'register',
      depends_on: ['route'],
    },
  ]);
  assert.equal(selectNextStep(q).step.id, 'reg', 'register step unblocks before maxAttempts BLOCKED');
});

test('artifact proof blocks DONE when file_contains missing despite valid SHA + deploy (gv-boot-wire class)', async () => {
  const q = makeQueue([{
    id: 'wire',
    target_file: 'startup/register-founder-runtime-routes.js',
    task: 'wire scheduler',
    file_contains: ['startGoVegasOutreachScheduler'],
  }]);
  const r = await runNextStep(q, {
    buildFn: async () => ({ ok: true, commit_sha: 'deadbeef' }),
    verifyFn: async () => ({ ok: true }),
    deployProofFn: async () => ({ ok: true }),
    artifactProofFn: async () => ({
      ok: false,
      applicable: true,
      reason: 'artifact_proof_failed: startGoVegasOutreachScheduler',
    }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'artifact_proof');
  assert.match(r.reason, /artifact_proof_failed/);
  assert.equal(q.steps[0].status, STEP_STATUS.PENDING, 'retryable — not false done');
});

test('evaluateStepExpectations fails when declared substring absent from content', async () => {
  const proof = await evaluateStepExpectations(
    {
      id: 'wire',
      target_file: 'startup/x.js',
      file_contains: ['startGoVegasOutreachScheduler'],
    },
    {
      readFile: async () => 'export function unrelated() {}\n',
    },
  );
  assert.equal(proof.ok, false);
  assert.equal(proof.applicable, true);
  assert.match(proof.reason, /artifact_proof_failed/);
});

test('evaluateStepExpectations passes when declared substring present', async () => {
  const proof = await evaluateStepExpectations(
    {
      id: 'wire',
      target_file: 'startup/x.js',
      file_contains: ['startGoVegasOutreachScheduler'],
    },
    {
      readFile: async () => 'import { startGoVegasOutreachScheduler } from "../services/go-vegas-outreach-scheduler.js";\n',
    },
  );
  assert.equal(proof.ok, true);
  assert.equal(proof.applicable, true);
});

test('evaluateStepExpectations skips when step declares nothing', async () => {
  const proof = await evaluateStepExpectations({ id: 'a', target_file: 'docs/x.md' });
  assert.equal(proof.ok, true);
  assert.equal(proof.applicable, false);
});