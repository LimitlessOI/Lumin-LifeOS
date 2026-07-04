/**
 * SYNOPSIS: Regression tests for canonical memory capsule migration contract
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMemoryCapsulesMigration } from '../scripts/verify-memory-system.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

test('20260704 memory capsule migration preserves canonical capsule_id schema', () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, 'db/migrations/20260704_create_memory_capsules.sql'),
    'utf8',
  );

  assert.deepEqual(validateMemoryCapsulesMigration(migration), []);
});

test('memory capsule migration contract rejects duplicate owner_id table shape', () => {
  const generatedDuplicate = `
    CREATE TABLE IF NOT EXISTS memory_capsules (
      id UUID PRIMARY KEY,
      owner_id TEXT NOT NULL,
      signal_data JSONB NOT NULL,
      trust_level INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_memory_capsules_owner_id ON memory_capsules (owner_id);
  `;

  const failures = validateMemoryCapsulesMigration(generatedDuplicate);
  assert.ok(failures.some((failure) => failure.includes('must not re-create memory_capsules')));
  assert.ok(failures.some((failure) => failure.includes('must not index owner_id')));
  assert.ok(failures.some((failure) => failure.includes('capsule_id')));
});
