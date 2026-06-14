/**
 * Completion authority regression tests for /builder/build.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuildCompletionForBuildResponse } from '../routes/lifeos-council-builder-routes.js';

function buildSuccess(commitSha = 'abc123def4567890abcdef1234567890abcdef12') {
  return {
    ok: true,
    status: 'SUCCESS',
    committed: true,
    commit_sha: commitSha,
    target_file: 'services/example.js',
  };
}

test('commit_sha-only build is blocked by completion authority', async () => {
  const outcome = await evaluateBuildCompletionForBuildResponse({
    buildResult: buildSuccess(),
    taskBody: {},
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.blockedResponse?.blocker, 'FAIL_MISSING_EVIDENCE');
});

test('valid completion authority pass allows success', async () => {
  const outcome = await evaluateBuildCompletionForBuildResponse({
    buildResult: buildSuccess('f2555dfeee6a775063aea39db65f6facfd3868f9'),
    taskBody: {
      task: 'Implement "Multi-Lane Execution Governance" in the canonical path.',
      required_outcome: 'Multi-Lane Execution Governance',
    },
    readCommit: async () => ({
      ok: true,
      commit_sha: 'f2555dfeee6a775063aea39db65f6facfd3868f9',
      commit_message: 'Add Multi-Lane Execution Governance guard',
      changed_files: ['services/builderos-completion-authority.js'],
      patch_text: 'Multi-Lane Execution Governance',
    }),
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.completion?.granted, true);
  assert.match(String(outcome.completion?.completion_receipt_id || ''), /^ca_/);
});

test('rollback flag preserves old behavior with warning metadata', async () => {
  const prev = process.env.BUILDEROS_COMPLETION_AUTHORITY;
  process.env.BUILDEROS_COMPLETION_AUTHORITY = '0';
  try {
    const outcome = await evaluateBuildCompletionForBuildResponse({
      buildResult: buildSuccess(),
      taskBody: {},
    });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.completion?.rollback_bypass, true);
    assert.equal(outcome.metadata?.completion_authority_warning, 'BUILDEROS_COMPLETION_AUTHORITY=0');
  } finally {
    if (prev === undefined) delete process.env.BUILDEROS_COMPLETION_AUTHORITY;
    else process.env.BUILDEROS_COMPLETION_AUTHORITY = prev;
  }
});

test('non-success paths are unchanged (completion not required)', async () => {
  const outcome = await evaluateBuildCompletionForBuildResponse({
    buildResult: {
      ok: false,
      status: 'FAILED',
      committed: false,
      target_file: 'services/example.js',
    },
    taskBody: {},
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.completion?.completion_required, false);
  assert.equal(outcome.completion?.reason, 'build_not_claiming_success');
});

test('kernel-managed /build defers completion authority grant', async () => {
  const outcome = await evaluateBuildCompletionForBuildResponse({
    buildResult: buildSuccess(),
    taskBody: {
      task: 'Add tiny smoke test proof constant.',
      required_outcome: 'smoke test proof constant',
    },
    kernelManaged: true,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.metadata?.completion_deferred_to_kernel, true);
  assert.equal(outcome.completion?.granted, false);
  assert.equal(outcome.completion?.reason, 'completion_deferred_to_kernel');
});

