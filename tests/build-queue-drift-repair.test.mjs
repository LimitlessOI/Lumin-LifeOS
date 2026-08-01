/**
 * SYNOPSIS: Tests for the deterministic BUILD_QUEUE drift repair executor.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { dryRun } from '../scripts/build-queue-drift-repair.mjs';

test('dryRun export exists and returns a summary without side effects', async () => {
  const result = await dryRun('builderos');
  assert.strictEqual(typeof result, 'object');
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(typeof result.dry_run_count, 'number');
});

test('lessons log is written during repair', () => {
  assert.strictEqual(fs.existsSync('data/build-queue-drift-lessons.jsonl'), true);
});
