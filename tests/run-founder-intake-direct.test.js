/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const STRUCTURED_DIRECT_TEXT = [
  'Problem:',
  'Fix the LifeOS communication send button label',
  '',
  'Desired Outcome:',
  'Fix the LifeOS communication send button label',
  '',
  'Scope Boundary:',
  'Only the minimum files required to complete this exact request.',
  '',
  'Constraints:',
  '- No theater, no simulation, no fake success',
  '- Keep behavior fail-closed and reversible where possible',
  '',
  'Success Metric:',
  'Requested change is visible/real in the live target surface or endpoint.',
  '',
  'Failure Metric:',
  'No real change, or missing execution evidence/receipts.',
  '',
  'Unacceptable Result:',
  'Claiming completion without runtime-verifiable evidence.',
  '',
  'Founder Success Test:',
  'Founder can verify the requested change directly in the app/runtime.',
  '',
  'Acceptance Command:',
  'Return command_truth, pass_fail, exit_code, commit_sha, changed_files, receipt_paths, first_blocker.',
].join('\n');

test('direct founder intake emits gate-readable artifacts for structured payloads', () => {
  const missionId = `TEST-DIRECT-INTAKE-${process.pid}-${Date.now()}`;
  const missionFolder = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS', missionId);
  rmSync(missionFolder, { recursive: true, force: true });

  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(REPO_ROOT, 'scripts', 'run-founder-intake-direct.mjs'),
        '--text',
        STRUCTURED_DIRECT_TEXT,
        '--mission-id',
        missionId,
        '--stage',
        'development',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.first_blocker, null);
    assert.match(parsed.founder_packet_path, /FOUNDER_PACKET\.md$/);
    assert.match(parsed.intent_baseline_path, /INTENT_BASELINE\.json$/);
    assert.equal(parsed.parsed_output, undefined);
  } finally {
    rmSync(missionFolder, { recursive: true, force: true });
  }
});
