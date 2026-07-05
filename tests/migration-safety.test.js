/**
 * SYNOPSIS: Regression guards for startup migration safety.
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeIdempotentMigrationFailure } from '../startup/database.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

test('migration runner retries missing-object failures instead of marking applied', () => {
  assert.equal(
    isSafeIdempotentMigrationFailure('relation "epistemic_facts" does not exist'),
    false
  );
  assert.equal(
    isSafeIdempotentMigrationFailure('column "created_at" does not exist'),
    false
  );
  assert.equal(
    isSafeIdempotentMigrationFailure('relation "prospect_sites" already exists'),
    true
  );
});

test('prospect_sites repair migration is non-destructive', () => {
  const sql = read('db/migrations/20260705_repair_prospect_sites_schema.sql');

  assert.doesNotMatch(
    sql,
    /\bDROP\s+TABLE\b/i,
    'prospect_sites repair must not drop production prospect rows'
  );
  assert.match(
    sql,
    /ALTER\s+TABLE\s+prospect_sites\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+client_id/i
  );
  assert.match(sql, /UPDATE\s+prospect_sites\s+SET\s+client_id/i);
});
