/**
 * SYNOPSIS: js — tests/factory-mount-routes-codegen-prompt.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldIncludeExistingFileContent, MAX_EXISTING_CONTENT_BYTES } from '../routes/factory-mount-routes.js';

test('shouldIncludeExistingFileContent: includes a real existing file just over the old 20000-byte gate', () => {
  // Regression for the exact size that repeatedly blocked
  // sb-deliverability-gate (services/site-builder-prospect-runner.js).
  assert.equal(shouldIncludeExistingFileContent(21306), true);
});

test('shouldIncludeExistingFileContent: includes files at and under the threshold', () => {
  assert.equal(shouldIncludeExistingFileContent(0), true);
  assert.equal(shouldIncludeExistingFileContent(20000), true);
  assert.equal(shouldIncludeExistingFileContent(MAX_EXISTING_CONTENT_BYTES), true);
});

test('shouldIncludeExistingFileContent: excludes files over the threshold', () => {
  assert.equal(shouldIncludeExistingFileContent(MAX_EXISTING_CONTENT_BYTES + 1), false);
});

test('shouldIncludeExistingFileContent: fails closed on non-finite/invalid sizes', () => {
  assert.equal(shouldIncludeExistingFileContent(NaN), false);
  assert.equal(shouldIncludeExistingFileContent(-1), false);
  assert.equal(shouldIncludeExistingFileContent(undefined), false);
});
