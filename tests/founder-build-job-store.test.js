/**
 * SYNOPSIS: js — tests/founder-build-job-store.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveFounderBuildJobStatus,
  isFounderBuildProofPending,
} from '../services/founder-build-job-store.js';

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
