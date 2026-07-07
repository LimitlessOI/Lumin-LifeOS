/**
 * SYNOPSIS: js — tests/never-stop-idempotent-complete.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetFileExists, lastCommitShaForFile } from '../services/never-stop-product-factory.js';

test('targetFileExists is true for a tracked file, false for missing/empty/undefined', () => {
  assert.equal(targetFileExists('services/never-stop-product-factory.js'), true);
  assert.equal(targetFileExists('services/this-file-does-not-exist-xyz.js'), false);
  assert.equal(targetFileExists(''), false);
  assert.equal(targetFileExists(undefined), false);
});

test('lastCommitShaForFile returns a 40-char sha for a tracked file, null for an untracked path', async () => {
  const sha = await lastCommitShaForFile('services/never-stop-product-factory.js');
  assert.match(sha, /^[0-9a-f]{40}$/i, 'tracked file resolves to its last-touching commit sha');
  const none = await lastCommitShaForFile('services/never-committed-file-xyz.js');
  assert.equal(none, null, 'untracked path yields null (no false built sha)');
});
