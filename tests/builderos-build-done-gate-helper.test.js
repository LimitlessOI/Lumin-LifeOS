/**
 * SYNOPSIS: BuilderOS /build DONE gate helper — Repair Lane platform GAP-FILL.
 * BuilderOS /build DONE gate helper — Repair Lane platform GAP-FILL.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBuildDoneGate,
  evaluateBuildDoneGateAsync,
  isCommitShaOnlySuccess,
} from '../services/builderos-build-done-gate-helper.js';

test('commit_sha alone does not pass DONE gate evaluation', () => {
  const buildResult = {
    ok: true,
    committed: true,
    commit_sha: 'abc123def4567890abcdef1234567890abcdef12',
    target_file: 'services/example.js',
  };

  assert.equal(isCommitShaOnlySuccess(buildResult), true);

  const result = evaluateBuildDoneGate({ buildResult, task_id: 'task-sha-only' });
  assert.equal(result.ok, false);
  assert.equal(result.done_gate_required, true);
  assert.equal(result.done_gate_passed, false);
  assert.match(result.reason, /commit_sha_only|done_gate/);
  assert.ok(result.blocker);
  assert.match(result.blocker, /^BUILDEROS_DONE_BLOCKED:/);
});

test('valid DONE gate receipt allows marking build DONE', () => {
  const buildResult = {
    ok: true,
    committed: true,
    commit_sha: 'abc123def4567890abcdef1234567890abcdef12',
    target_file: 'services/builderos-build-done-gate-helper.js',
  };
  const doneGate = {
    allowed: true,
    proof_status: 'complete',
    reason: 'complete',
    hasToken: true,
    hasOil: true,
    build: { end_time: '2026-06-13T00:00:00.000Z' },
  };

  assert.equal(isCommitShaOnlySuccess(buildResult, doneGate), false);

  const result = evaluateBuildDoneGate({
    buildResult,
    task_id: 'task-gate-pass',
    doneGate,
    controlPlaneAvailable: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.done_gate_required, true);
  assert.equal(result.done_gate_passed, true);
  assert.equal(result.blocker, null);
  assert.equal(result.receipt_path, 'build_task_ledger:task-gate-pass');
});

test('missing required DONE gate evidence returns blocker', () => {
  const buildResult = {
    ok: true,
    committed: true,
    commit_sha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    target_file: 'routes/lifeos-council-builder-routes.js',
  };
  const doneGate = {
    allowed: false,
    reason: 'missing_proof:token_receipt,oil_receipt',
    proof_status: 'partial',
    hasToken: false,
    hasOil: false,
  };

  const result = evaluateBuildDoneGate({
    buildResult,
    task_id: 'task-missing-proof',
    doneGate,
    controlPlaneAvailable: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.done_gate_passed, false);
  assert.equal(result.reason, 'missing_proof:token_receipt,oil_receipt');
  assert.equal(result.blocker, 'BUILDEROS_DONE_BLOCKED:missing_proof:token_receipt,oil_receipt');
});

test('evaluateBuildDoneGateAsync fetches control-plane gate when available', async () => {
  const buildResult = {
    ok: true,
    committed: true,
    commit_sha: 'cafebabecafebabecafebabecafebabecafebabe',
  };
  const doneGate = { allowed: true, proof_status: 'complete', reason: 'complete' };
  const controlPlane = {
    canMarkBuildDone: async ({ task_id }) => {
      assert.equal(task_id, 'task-async');
      return doneGate;
    },
  };

  const result = await evaluateBuildDoneGateAsync({
    buildResult,
    task_id: 'task-async',
    controlPlane,
  });
  assert.equal(result.ok, true);
  assert.equal(result.done_gate_passed, true);
});

test('build not claiming success skips DONE gate requirement', () => {
  const result = evaluateBuildDoneGate({
    buildResult: { ok: false, error: 'builder_failed' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.done_gate_required, false);
  assert.equal(result.reason, 'build_not_claiming_success');
  assert.equal(result.blocker, null);
});
