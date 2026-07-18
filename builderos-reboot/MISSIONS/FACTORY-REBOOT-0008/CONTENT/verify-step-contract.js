/**
 * SYNOPSIS: Exports loadAcceptanceTestsForMission — builderos-reboot/MISSIONS/FACTORY-REBOOT-0008/CONTENT/verify-step-contract.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT } from '../repo-paths.js';

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

export function loadAcceptanceTestsForMission(missionId) {
  if (!missionId || missionId === 'unknown') return [];
  const p = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId, 'ACCEPTANCE_TESTS.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function verifyStepContract({ mission_id, step, builderResult }) {
  const tests = loadAcceptanceTestsForMission(mission_id).filter((t) => t.step_id === step.step_id);
  const failures = [];

  for (const test of tests) {
    const target = path.join(REPO_ROOT, test.target);
    if (test.type === 'file_sha256_matches') {
      if (!fs.existsSync(target)) {
        failures.push({ test_id: test.test_id, reason: 'missing file' });
      } else if (sha256File(target) !== test.expected_sha256) {
        failures.push({ test_id: test.test_id, reason: 'sha256 mismatch' });
      }
    } else if (test.type === 'file_exists' && !fs.existsSync(target)) {
      failures.push({ test_id: test.test_id, reason: 'file missing' });
    }
  }

  if (builderResult.status !== 'DONE') {
    failures.push({ test_id: 'builder-status', reason: `status ${builderResult.status}` });
  }

  return {
    pass: failures.length === 0,
    tests_run: tests.length,
    failures,
  };
}
