/**
 * SYNOPSIS: Revive-thrash and same_signature_count escalation tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  STEP_STATUS,
  runNextStep,
  reviveStaleBlockedSteps,
} from '../services/product-build-orchestrator.js';

function makeQueue(stepOverrides = {}) {
  return {
    product_id: 'test',
    schema: 'product_build_queue_v1',
    steps: [{
      id: 'test-step',
      target_file: 'services/test.js',
      task: 'do thing',
      status: STEP_STATUS.PENDING,
      attempts: 0,
      same_signature_count: 0,
      ...stepOverrides,
    }],
  };
}

const forbiddenReason = (status) => `Step test-step is ${status === 'done' ? 'DONE' : `status is "${status}"`} — cannot construct from a terminal/blocked step without a blueprint amendment [diag twin_source=runtime twin_path=docs/products/test/BUILD_QUEUE.json twin_mtime=2026-07-31T12:00:00.000Z]`;

describe('revive-thrash', () => {
  it('escalates STEP_STATUS_FORBIDDEN after 3 identical failures, before maxAttempts', async () => {
    const queue = makeQueue();
    const buildFn = () => Promise.resolve({ ok: false, error: forbiddenReason('blocked'), commit_sha: 'deadbeef' });

    for (let i = 0; i < 3; i += 1) {
      const result = await runNextStep(queue, { buildFn, maxAttempts: 10, logger: null });
      assert.equal(result.ok, false);
      assert.equal(result.step_id, 'test-step');
      if (i < 2) assert.equal(result.blocked, false);
    }

    const step = queue.steps[0];
    assert.equal(step.status, STEP_STATUS.BLOCKED);
    assert.equal(step.escalation_required, true);
    assert.equal(step.same_signature_count, 3);
    assert.equal(step.failure_signature, 'STEP_STATUS_FORBIDDEN:blocked');
  });

  it('resets same_signature_count when the failure signature changes', async () => {
    const queue = makeQueue();
    let n = 0;
    const buildFn = () => {
      n += 1;
      const error = n === 1
        ? forbiddenReason('blocked')
        : forbiddenReason('done');
      return Promise.resolve({ ok: false, error, commit_sha: 'deadbeef' });
    };

    await runNextStep(queue, { buildFn, maxAttempts: 10, logger: null });
    assert.equal(queue.steps[0].same_signature_count, 1);
    assert.equal(queue.steps[0].failure_signature, 'STEP_STATUS_FORBIDDEN:blocked');

    await runNextStep(queue, { buildFn, maxAttempts: 10, logger: null });
    assert.equal(queue.steps[0].same_signature_count, 1);
    assert.equal(queue.steps[0].failure_signature, 'STEP_STATUS_FORBIDDEN:done');

    await runNextStep(queue, { buildFn, maxAttempts: 10, logger: null });
    assert.equal(queue.steps[0].same_signature_count, 2);
    assert.equal(queue.steps[0].failure_signature, 'STEP_STATUS_FORBIDDEN:done');
  });

  it('does not auto-revive an escalation_required step', () => {
    const queue = makeQueue({ status: STEP_STATUS.BLOCKED, escalation_required: true, failure_signature: 'STEP_STATUS_FORBIDDEN:blocked', same_signature_count: 3 });
    const revived = reviveStaleBlockedSteps(queue, { now: Date.now() + 24 * 60 * 60 * 1000 });
    assert.deepEqual(revived, []);
    assert.equal(queue.steps[0].status, STEP_STATUS.BLOCKED);
    assert.equal(queue.steps[0].escalation_required, true);
  });

  it('still blocks after maxAttempts for non-repeating failures', async () => {
    const queue = makeQueue();
    let n = 0;
    const buildFn = () => {
      n += 1;
      return Promise.resolve({ ok: false, error: `error ${n}`, commit_sha: 'deadbeef' });
    };
    for (let i = 0; i < 3; i += 1) {
      await runNextStep(queue, { buildFn, maxAttempts: 3, logger: null });
    }
    const step = queue.steps[0];
    assert.equal(step.status, STEP_STATUS.BLOCKED);
    assert.equal(step.attempts, 3);
  });
});
