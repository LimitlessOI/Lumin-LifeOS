/**
 * SYNOPSIS: Chair must recall last build SHA on follow-up (not deny after PASS).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFounderBuildJob,
  setFounderBuildJobResult,
  getLatestFounderBuildJobForUser,
} from '../services/founder-build-job-store.js';
import { summarizeFounderBuildReceipt } from '../services/builderos-command-control-service.js';
import { sanitizeConversationReply } from '../services/lifeos-execution-truth.js';

test('in-memory latest job is user-scoped and summarizes with commit_sha', () => {
  const jobId = createFounderBuildJob({ task: 'round the send button', userId: 42 });
  setFounderBuildJobResult(jobId, {
    pass_fail: 'PASS',
    committed: true,
    sha: 'abcdef0123456789abcdef0123456789abcdef01',
    target_file: 'public/overlay/lifeos-theme-overrides.css',
    transport_status: 'COMMIT_ONLY_NOT_LIVE',
  });
  const latest = getLatestFounderBuildJobForUser(42);
  assert.ok(latest);
  assert.equal(latest.id, jobId);
  const receipt = summarizeFounderBuildReceipt({
    id: latest.id,
    task: latest.task,
    result: latest.result,
    created_at: latest.updated_at,
  });
  assert.equal(receipt.commit_sha, 'abcdef0123456789abcdef0123456789abcdef01');
  assert.equal(receipt.committed, true);
  assert.equal(receipt.pass_fail, 'PASS');
});

test('sanitizeConversationReply allows citing known last_build_receipt SHA', () => {
  const sha = 'f58e8b9d6b95a0f183f09a0c3717ca6303f73714';
  const reply = `Yes — it landed. Commit ${sha.slice(0, 12)}. Send button is more rounded.`;
  const out = sanitizeConversationReply(reply, {
    command_truth: 'NO_COMMAND_RAN',
    last_build_receipt: {
      commit_sha: sha,
      committed: true,
      pass_fail: 'PASS',
    },
  });
  assert.match(out, /f58e8b9d6b95/);
  assert.doesNotMatch(out, /Blocked false claim/);
});

test('sanitizeConversationReply still blocks invented COMMITTED theater without receipt', () => {
  const out = sanitizeConversationReply(
    'Successfully executed. COMMITTED to github. Deployed to production.',
    { command_truth: 'NO_COMMAND_RAN' },
  );
  assert.match(out, /No command ran|cannot claim/i);
});
