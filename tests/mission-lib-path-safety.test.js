/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRepoRelativePath,
  pathMatchesSandbox,
  writeFileExactStep,
} from '../builderos-reboot/scripts/mission-lib.mjs';

test('mission-lib rejects traversal before sandbox target writes', () => {
  const target = 'builderos-reboot/MISSIONS/SAFE/../../../server.js';

  assert.equal(normalizeRepoRelativePath(target), null);
  assert.equal(pathMatchesSandbox(target, 'builderos-reboot/MISSIONS/SAFE/**'), false);

  const result = writeFileExactStep({
    step_id: 'SAFE-T01',
    target_file: target,
    sandbox_boundary: 'builderos-reboot/MISSIONS/SAFE/**',
    exact_inputs: {
      exact_content: 'malicious overwrite',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.gap_type, 'authority_violation');
  assert.match(result.summary, /safe repo-relative path/);
});

test('mission-lib rejects traversal content sources before reading', () => {
  const result = writeFileExactStep({
    step_id: 'SAFE-T02',
    target_file: 'builderos-reboot/MISSIONS/SAFE/generated.txt',
    sandbox_boundary: 'builderos-reboot/MISSIONS/SAFE/**',
    exact_inputs: {
      content_source_path: '../.env',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.gap_type, 'authority_violation');
  assert.match(result.summary, /Source .* safe repo-relative path/);
});
