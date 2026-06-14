/**
 * /build DONE-gate route wiring behavior.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuildDoneGateForBuildResponse } from '../routes/lifeos-council-builder-routes.js';

function successBuildResult() {
  return {
    ok: true,
    status: 'SUCCESS',
    committed: true,
    commit_sha: 'bb3359de60d00dc6087da63b5fd9f08d7b528889',
    target_file: 'routes/lifeos-council-builder-routes.js',
  };
}

test('A: commit_sha alone does not pass DONE gate', async () => {
  const outcome = await evaluateBuildDoneGateForBuildResponse({
    buildResult: successBuildResult(),
    taskId: 'task-sha-only',
    controlPlane: null,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.blockedResponse?.blocker, 'BUILDEROS_DONE_BLOCKED');
  assert.match(String(outcome.blockedResponse?.reason || ''), /commit_sha_only|done_gate_required|done_gate_pending/);
});

test('B: DONE gate pass allows success response path', async () => {
  const controlPlane = {
    canMarkBuildDone: async ({ task_id }) => {
      assert.equal(task_id, 'task-pass');
      return { allowed: true, reason: 'complete', proof_status: 'complete' };
    },
  };
  const outcome = await evaluateBuildDoneGateForBuildResponse({
    buildResult: successBuildResult(),
    taskId: 'task-pass',
    controlPlane,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.doneGate.done_gate_required, true);
  assert.equal(outcome.doneGate.done_gate_passed, true);
});

test('C: missing evidence blocks success with structured blocker', async () => {
  const controlPlane = {
    canMarkBuildDone: async () => ({
      allowed: false,
      reason: 'missing_proof:token_receipt,oil_receipt',
      proof_status: 'partial',
    }),
  };
  const outcome = await evaluateBuildDoneGateForBuildResponse({
    buildResult: successBuildResult(),
    taskId: 'task-missing-evidence',
    controlPlane,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.blockedResponse?.blocker, 'BUILDEROS_DONE_BLOCKED');
  assert.equal(outcome.blockedResponse?.reason, 'missing_proof:token_receipt,oil_receipt');
  assert.deepEqual(outcome.blockedResponse?.missing_evidence, ['token_receipt', 'oil_receipt']);
});

test('D: existing non-success paths remain unchanged (no done-gate block)', async () => {
  const controlPlane = {
    canMarkBuildDone: async () => ({ allowed: false, reason: 'missing_proof:token_receipt' }),
  };
  const outcome = await evaluateBuildDoneGateForBuildResponse({
    buildResult: {
      ok: false,
      status: 'FAILED',
      committed: false,
      target_file: 'routes/lifeos-council-builder-routes.js',
    },
    taskId: 'task-build-failed',
    controlPlane,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.doneGate.done_gate_required, false);
  assert.equal(outcome.doneGate.reason, 'build_not_claiming_success');
});
