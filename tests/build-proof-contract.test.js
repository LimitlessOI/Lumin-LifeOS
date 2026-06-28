/**
 * SYNOPSIS: js — tests/build-proof-contract.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuildProof } from '../services/build-proof-contract.js';

test('code-changing pass requires commit sha', () => {
  const out = evaluateBuildProof({ codeChanging: true, commitSha: null });
  assert.equal(out.ok, false);
  assert.equal(out.transport_status, 'COMMIT_NO_SHA');
});

test('origin miss blocks remote transport pass', () => {
  const out = evaluateBuildProof({ codeChanging: true, commitSha: 'abc123', originContainsCommit: false });
  assert.equal(out.ok, false);
  assert.equal(out.transport_status, 'ORIGIN_MAIN_NOT_UPDATED');
});

test('deploy-required proof distinguishes not live from live', () => {
  const notLive = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: true,
    deployRequired: true,
  });
  assert.equal(notLive.ok, true);
  assert.equal(notLive.transport_status, 'COMMIT_ONLY_NOT_LIVE');

  const live = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: true,
    deployRequired: true,
    deployMatchesOriginMain: true,
    runtimeBehaviorVerified: true,
  });
  assert.equal(live.ok, true);
  assert.equal(live.transport_status, 'LIVE_BEHAVIOR_PASS');
});

test('live behavior proof beats stale deploy sha mismatch', () => {
  const out = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: true,
    deployRequired: true,
    deployMatchesOriginMain: false,
    runtimeBehaviorVerified: true,
  });
  assert.equal(out.ok, true);
  assert.equal(out.transport_status, 'LIVE_BEHAVIOR_PASS');
});
