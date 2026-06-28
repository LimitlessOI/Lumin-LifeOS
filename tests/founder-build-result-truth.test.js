/**
 * SYNOPSIS: js — tests/founder-build-result-truth.test.js.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hydrateFounderBuildResultTruth,
  refreshFounderBuildResultTruth,
} from '../services/founder-build-result-truth.js';

test('hydrateFounderBuildResultTruth preserves existing truth-complete results', () => {
  const input = {
    pass_fail: 'PASS',
    committed: true,
    target_file: 'public/overlay/lifeos-app.html',
    sha: 'abc123',
    command_truth: 'COMMITTED',
    receipt_truth: 'COMMIT_SHA_PRESENT',
    transport_status: 'REMOTE_TRANSPORT_PASS',
    human_summary: 'done',
  };
  const out = hydrateFounderBuildResultTruth(input, 'noop');
  assert.deepEqual(out, input);
});

test('hydrateFounderBuildResultTruth backfills truth fields for async founder pass', () => {
  const out = hydrateFounderBuildResultTruth({
    pass_fail: 'PASS',
    committed: true,
    ok: true,
    target_file: 'scripts/lifeos-direct-build-smoke-test.mjs',
    sha: 'abc123',
    execution_path: 'builder_task_execute',
  }, 'do: add smoke file');
  assert.equal(out.pass_fail, 'PASS');
  assert.equal(out.command_truth, 'COMMITTED');
  assert.equal(out.receipt_truth, 'COMMIT_SHA_PRESENT');
  assert.ok(typeof out.transport_status === 'string');
});

test('refreshFounderBuildResultTruth promotes commit-only proof when live deploy sha matches commit', async () => {
  const out = await refreshFounderBuildResultTruth({
    pass_fail: 'PASS',
    committed: true,
    ok: true,
    target_file: 'scripts/lifeos-direct-build-smoke-test.mjs',
    sha: 'abc123def456',
    execution_path: 'builder_task_execute',
  }, {
    task: 'do: add smoke file',
    baseUrl: 'https://example.com',
    commandKey: 'test-key',
    fetchDeployCommitShaImpl: async () => 'abc123def456',
  });
  assert.equal(out.transport_status, 'REMOTE_TRANSPORT_PASS');
  assert.equal(out.origin_contains_commit, true);
});

test('refreshFounderBuildResultTruth promotes html comment founder probe to live behavior pass', async () => {
  const out = await refreshFounderBuildResultTruth({
    pass_fail: 'PASS',
    committed: true,
    ok: true,
    target_file: 'public/overlay/lifeos-app.html',
    sha: 'abc123def456',
    execution_path: 'builder_task_execute',
    founder_verification_required: true,
    transport_status: 'COMMIT_ONLY_NOT_LIVE',
  }, {
    task: 'do: add HTML comment <!-- founder-chat-alpha-probe --> as first line inside <body> in public/overlay/lifeos-app.html',
    baseUrl: 'https://example.com',
    commandKey: 'test-key',
    fetchDeployCommitShaImpl: async () => 'abc123def456',
    fetchLiveOverlayHtmlImpl: async () => ({
      ok: true,
      text: '<body>\n<!-- founder-chat-alpha-probe -->\n</body>',
    }),
  });
  assert.equal(out.transport_status, 'LIVE_BEHAVIOR_PASS');
  assert.equal(out.founder_verification?.code, 'LIVE_MARKER_VERIFIED');
});
