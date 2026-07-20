/**
 * SYNOPSIS: the empty-diff [system-build] claim gate — a commit tagged
 * [system-build] with zero real (non-generated) staged changes is blocked.
 * Regression guard for commit 3fa6594f0b (claimed a specific fix; touched
 * only the generated synopsis index).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEmptyDiffClaim, sumRealChanges } from '../scripts/verify-gap-fill-honesty.mjs';

test('sumRealChanges: excludes the generated synopsis index from the real-change count', () => {
  const numstat = [
    '3\t3\tbuilderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json',
  ].join('\n');
  const { realChanges, realFiles } = sumRealChanges(numstat);
  assert.equal(realChanges, 0);
  assert.deepEqual(realFiles, []);
});

test('sumRealChanges: counts real functional file changes', () => {
  const numstat = [
    '3\t3\tbuilderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json',
    '5\t1\tservices/cognitive-core-oracle.js',
  ].join('\n');
  const { realChanges, realFiles } = sumRealChanges(numstat);
  assert.equal(realChanges, 6);
  assert.deepEqual(realFiles, ['services/cognitive-core-oracle.js']);
});

test('checkEmptyDiffClaim: a [system-build] commit with only the generated index changed exits the process (blocked)', () => {
  const fakeExec = () => '3\t3\tbuilderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json\n';
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code; throw new Error('__exit__'); };
  try {
    assert.throws(() => {
      checkEmptyDiffClaim('[system-build] claims a fix', { execFn: fakeExec });
    }, /__exit__/);
    assert.equal(exitCode, 1);
  } finally {
    process.exit = originalExit;
  }
});

test('checkEmptyDiffClaim: a [system-build] commit with real changes passes cleanly', () => {
  const fakeExec = () => '3\t3\tbuilderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json\n5\t1\tservices/cognitive-core-oracle.js\n';
  const result = checkEmptyDiffClaim('[system-build] a real fix', { execFn: fakeExec });
  assert.equal(result, true);
});

test('checkEmptyDiffClaim: a plain GAP-FILL commit (no [system-build] tag) is not subject to this check at all', () => {
  const fakeExec = () => { throw new Error('should not be called'); };
  const result = checkEmptyDiffClaim('GAP-FILL: hand-authored fix, no builder claim made', { execFn: fakeExec });
  assert.equal(result, true);
});

test('checkEmptyDiffClaim: fails open (does not block) if git itself errors', () => {
  const fakeExec = () => { throw new Error('git error'); };
  const result = checkEmptyDiffClaim('[system-build] whatever', { execFn: fakeExec });
  assert.equal(result, true);
});
