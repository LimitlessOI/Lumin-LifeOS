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

test('deploy-required commit-only fails closed', () => {
  const notLive = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: true,
    deployRequired: true,
  });
  assert.equal(notLive.ok, false);
  assert.equal(notLive.transport_status, 'COMMIT_ONLY_NOT_LIVE');
  assert.equal(notLive.fail_code, 'COMMIT_ONLY_NOT_LIVE');
});

test('deploy sync pass is ok when deploy matches origin', () => {
  const deploySync = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: true,
    deployRequired: true,
    deployMatchesOriginMain: true,
  });
  assert.equal(deploySync.ok, true);
  assert.equal(deploySync.transport_status, 'DEPLOY_SYNC_PASS');
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

test('fallback commit-only without origin proof fails closed', () => {
  const out = evaluateBuildProof({
    codeChanging: true,
    commitSha: 'abc123',
    originContainsCommit: null,
    deployRequired: false,
  });
  assert.equal(out.ok, false);
  assert.equal(out.transport_status, 'COMMIT_ONLY_NOT_LIVE');
});
