/**
 * SYNOPSIS: js — tests/founder-build-job-store.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveFounderBuildJobStatus,
  isFounderBuildProofPending,
} from '../services/founder-build-job-store.js';
import {
  getFounderBuildJobStatus,
  startFounderBuildJob,
} from '../services/founder-build-self-repair.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('founder build proof pending is true for commit-only pass when founder verification required', () => {
  const result = {
    pass_fail: 'PASS',
    committed: true,
    founder_verification_required: true,
    transport_status: 'COMMIT_ONLY_NOT_LIVE',
  };
  assert.equal(isFounderBuildProofPending(result), true);
  assert.equal(deriveFounderBuildJobStatus(result), 'waiting_for_proof');
});

test('founder build proof pending uses execution_path fallback for surgical html', () => {
  const result = {
    pass_fail: 'PASS',
    committed: true,
    execution_path: 'founder_surgical_html_patch',
    transport_status: 'DEPLOY_NOT_SYNCED',
  };
  assert.equal(isFounderBuildProofPending(result), true);
  assert.equal(deriveFounderBuildJobStatus(result), 'waiting_for_proof');
});

test('script-only commit-only pass is completed not waiting_for_proof', () => {
  const result = {
    pass_fail: 'PASS',
    committed: true,
    transport_status: 'COMMIT_ONLY_NOT_LIVE',
  };
  assert.equal(isFounderBuildProofPending(result), false);
  assert.equal(deriveFounderBuildJobStatus(result), 'completed');
});

test('founder build proof pending is false for live verified pass', () => {
  const result = {
    pass_fail: 'PASS',
    committed: true,
    transport_status: 'LIVE_BEHAVIOR_PASS',
  };
  assert.equal(isFounderBuildProofPending(result), false);
  assert.equal(deriveFounderBuildJobStatus(result), 'completed');
});

test('failed founder build remains failed', () => {
  assert.equal(deriveFounderBuildJobStatus({ pass_fail: 'FAIL' }), 'failed');
});

test('slow async founder build stays running after timeout notice and records late pass', async (t) => {
  const previousTimeout = process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS;
  process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS = '20';
  t.after(() => {
    if (previousTimeout === undefined) {
      delete process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS;
    } else {
      process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS = previousTimeout;
    }
  });

  const jobId = startFounderBuildJob({
    task: 'slow founder build',
  }, {
    runBuild: async () => {
      await delay(60);
      return {
        ok: true,
        pass_fail: 'PASS',
        committed: true,
        target_file: 'services/example.js',
        sha: 'abc123def456',
        execution_path: 'builder_task_execute',
        transport_status: 'REMOTE_TRANSPORT_PASS',
      };
    },
  });

  await delay(35);
  const running = getFounderBuildJobStatus(jobId);
  assert.equal(running.status, 'running');
  assert.equal(running.result, null);
  assert.equal(running.steps.at(-1).label, 'Still working past the response budget');

  await delay(50);
  const completed = getFounderBuildJobStatus(jobId);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.result.pass_fail, 'PASS');
  assert.equal(completed.result.committed, true);
});
