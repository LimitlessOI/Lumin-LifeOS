/**
 * SYNOPSIS: js — tests/founder-build-result-truth.test.js.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { hydrateFounderBuildResultTruth } from '../services/founder-build-result-truth.js';

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
