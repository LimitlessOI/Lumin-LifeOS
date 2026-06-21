import assert from 'node:assert/strict';
import { verifyFounderCssCommitOutcome } from '../services/founder-build-outcome.js';

async function testOutcomePass() {
  const readCommit = async () => ({
    ok: true,
    commit_sha: 'abc123',
    commit_message: 'css patch',
    changed_files: [
      'public/overlay/lifeos-theme-overrides.css',
      'public/overlay/lifeos-dashboard.html',
      'public/overlay/lifeos-app.html',
      'public/overlay/sw.js',
    ],
    patch_text: 'background: #ffeb3b; color: #000000;',
  });
  const result = await verifyFounderCssCommitOutcome({
    task: 'change response color to yellow with black text',
    commitSha: 'abc123',
    colors: { background: '#ffeb3b', color: '#000000' },
    readCommit,
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, 'PASS_OUTCOME_VERIFIED');
}

async function testOutcomeMissingFile() {
  const readCommit = async () => ({
    ok: true,
    commit_sha: 'abc123',
    commit_message: 'css patch',
    changed_files: ['public/overlay/lifeos-theme-overrides.css'],
    patch_text: '#ffeb3b',
  });
  const result = await verifyFounderCssCommitOutcome({
    task: 'yellow bubbles',
    commitSha: 'abc123',
    colors: { background: '#ffeb3b', color: '#000000' },
    readCommit,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'SCOPE_INCOMPLETE');
}

await testOutcomePass();
await testOutcomeMissingFile();
console.log('founder-build-outcome tests: PASS');
