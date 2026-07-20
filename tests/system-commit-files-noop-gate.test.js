/**
 * SYNOPSIS: machine-ship honesty gate — assessShip() blocks reporting success
 * when a requested file did not actually change (empty-diff false-claim risk).
 * Regression guard for commit 3fa6594f0b (a [system-build] claim whose real
 * diff touched only the generated synopsis index). The local commit-msg hook
 * (verify-gap-fill-honesty.mjs) cannot catch this — the machine path commits
 * server-side and never runs local git hooks.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assessShip } from '../scripts/system-commit-files.mjs';

test('assessShip: blocks when a requested file did NOT change (server reported unchanged_files)', () => {
  const r = assessShip(['services/cognitive-core-capture.js'], {
    committed: true,
    changed_files: [],
    unchanged_files: ['services/cognitive-core-capture.js'],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.unchanged, ['services/cognitive-core-capture.js']);
});

test('assessShip: derives unchanged from changed_files when unchanged_files is absent', () => {
  const r = assessShip(['services/foo.js', 'services/bar.js'], {
    committed: true,
    changed_files: ['services/foo.js'],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.unchanged, ['services/bar.js']);
});

test('assessShip: passes when every requested file actually changed', () => {
  const r = assessShip(['services/foo.js'], {
    committed: true,
    changed_files: ['services/foo.js'],
    unchanged_files: [],
  });
  assert.equal(r.ok, true);
  assert.equal(r.detection_available, true);
});

test('assessShip: fails OPEN when the server reports no change-detection (older deploy)', () => {
  const r = assessShip(['services/foo.js'], { committed: true });
  assert.equal(r.ok, true);
  assert.equal(r.detection_available, false);
});

test('assessShip: normalizes ./ and backslash path forms before comparing', () => {
  const r = assessShip(['./services/foo.js'], {
    committed: true,
    changed_files: ['services/foo.js'],
    unchanged_files: [],
  });
  assert.equal(r.ok, true);
});