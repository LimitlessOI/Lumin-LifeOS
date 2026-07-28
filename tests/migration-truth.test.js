/**
 * SYNOPSIS: Tests for migration-truth — an applied migration must prove its end state.
 *
 * Covers the library primitives and then drives the real runner
 * (startup/database.js initDatabase) against a stub pool, because the bug being
 * fixed lives in the runner's control flow, not in the helpers: a file that fails
 * with "already exists" is rolled back whole yet was recorded applied forever.
 *
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ASSERTION_KIND,
  assertionQuery,
  checksumMigration,
  describeAssertion,
  detectChecksumDrift,
  parseAssertions,
  verifyAssertions,
} from '../scripts/lib/migration-truth.mjs';
import { initDatabase, isSafeIdempotentMigrationFailure } from '../startup/database.js';

const quietLogger = { info() {}, warn() {}, error() {} };

test('checksumMigration is stable and content-sensitive', () => {
  assert.equal(checksumMigration('a'), checksumMigration('a'));
  assert.notEqual(checksumMigration('a'), checksumMigration('b'));
  assert.match(checksumMigration('x'), /^[0-9a-f]{64}$/);
});

test('parseAssertions reads table, column and index directives', () => {
  const { assertions, invalid } = parseAssertions([
    '-- @assert table:widgets',
    '-- @assert table:custom.gadgets',
    '-- @assert column:widgets.name',
    '-- @assert column:custom.gadgets.size',
    '-- @assert index:idx_widgets_name',
    'CREATE TABLE widgets (id int);',
  ].join('\n'));

  assert.deepEqual(invalid, []);
  assert.equal(assertions.length, 5);
  assert.deepEqual(assertions[0], { kind: 'table', schema: 'public', table: 'widgets' });
  assert.deepEqual(assertions[1], { kind: 'table', schema: 'custom', table: 'gadgets' });
  assert.deepEqual(assertions[2], { kind: 'column', schema: 'public', table: 'widgets', column: 'name' });
  assert.deepEqual(assertions[3], { kind: 'column', schema: 'custom', table: 'gadgets', column: 'size' });
  assert.deepEqual(assertions[4], { kind: 'index', schema: 'public', index: 'idx_widgets_name' });
});

test('a typo in an assertion is reported, never silently dropped', () => {
  const { assertions, invalid } = parseAssertions([
    '-- @assert tabel:widgets',
    '-- @assert column:only_one_part',
    '-- @assert',
  ].join('\n'));
  assert.deepEqual(assertions, []);
  assert.equal(invalid.length, 3);
  assert.match(invalid[0].reason, /unknown assertion kind/);
});

test('assertionQuery only ever reads', () => {
  for (const a of [
    { kind: ASSERTION_KIND.TABLE, schema: 'public', table: 't' },
    { kind: ASSERTION_KIND.COLUMN, schema: 'public', table: 't', column: 'c' },
    { kind: ASSERTION_KIND.INDEX, schema: 'public', index: 'i' },
  ]) {
    const { sql, params } = assertionQuery(a);
    assert.match(sql, /^SELECT 1 FROM/);
    assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE|DROP|ALTER|CREATE/i);
    assert.ok(params.length >= 2);
    assert.ok(describeAssertion(a).length > 3);
  }
  assert.throws(() => assertionQuery({ kind: 'nope' }), /unsupported assertion kind/);
});

test('verifyAssertions separates satisfied, missing and errored', async () => {
  const present = new Set(['t']);
  const query = async (sql, params) => {
    if (/errorplease/.test(params[1])) throw new Error('boom');
    return { rowCount: present.has(params[1]) ? 1 : 0 };
  };
  const verdict = await verifyAssertions(
    [
      { kind: 'table', schema: 'public', table: 't' },
      { kind: 'table', schema: 'public', table: 'missing' },
      { kind: 'table', schema: 'public', table: 'errorplease' },
    ],
    query,
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.satisfied.length, 1);
  assert.equal(verdict.missing.length, 1);
  assert.equal(verdict.errored.length, 1);
});

test('detectChecksumDrift treats a missing recorded checksum as unknown, not drift', () => {
  const sql = 'CREATE TABLE a (id int);';
  const unknown = detectChecksumDrift(null, sql);
  assert.equal(unknown.known, false);
  assert.equal(unknown.drifted, false);

  const clean = detectChecksumDrift(checksumMigration(sql), sql);
  assert.equal(clean.known, true);
  assert.equal(clean.drifted, false);

  const drifted = detectChecksumDrift(checksumMigration('other'), sql);
  assert.equal(drifted.drifted, true);
});

test('isSafeIdempotentMigrationFailure still matches only the narrow set', () => {
  assert.equal(isSafeIdempotentMigrationFailure('relation "x" already exists'), true);
  assert.equal(isSafeIdempotentMigrationFailure('duplicate key value'), true);
  assert.equal(isSafeIdempotentMigrationFailure('relation "x" does not exist'), false);
  assert.equal(isSafeIdempotentMigrationFailure(''), false);
});

// ── runner-level behaviour ───────────────────────────────────────────────────

function stubPool({ existingObjects = new Set(), recorded = [], migrationBehavior = () => {} }) {
  const inserts = [];
  const pool = {
    inserts,
    async query(sql, params = []) {
      if (/information_schema\.tables/.test(sql)) {
        return { rowCount: existingObjects.has(`table:${params[0]}.${params[1]}`) ? 1 : 0, rows: [] };
      }
      if (/information_schema\.columns/.test(sql)) {
        const key = `column:${params[0]}.${params[1]}.${params[2]}`;
        return { rowCount: existingObjects.has(key) ? 1 : 0, rows: [] };
      }
      if (/pg_indexes/.test(sql)) {
        return { rowCount: existingObjects.has(`index:${params[0]}.${params[1]}`) ? 1 : 0, rows: [] };
      }
      if (/CREATE TABLE IF NOT EXISTS schema_migrations|ALTER TABLE schema_migrations/.test(sql)) {
        return { rowCount: 0, rows: [] };
      }
      if (/SELECT filename, checksum FROM schema_migrations/.test(sql)) {
        return { rowCount: recorded.length, rows: recorded };
      }
      if (/INSERT INTO schema_migrations/.test(sql)) {
        inserts.push({ filename: params[0], checksum: params[1] });
        return { rowCount: 1, rows: [] };
      }
      return migrationBehavior(sql);
    },
  };
  return pool;
}

function withTempMigrations(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migtruth-'));
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  return Promise.resolve(fn(dir)).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

test('PASSES — a migration whose declared end state exists is marked applied', async () => {
  await withTempMigrations(
    { '20260728_ok.sql': '-- @assert table:widgets\nCREATE TABLE widgets (id int);\n' },
    async (migrationsDir) => {
      const pool = stubPool({ existingObjects: new Set(['table:public.widgets']) });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.equal(result.ran, 1);
      assert.deepEqual(result.failed, []);
      assert.equal(pool.inserts.length, 1, 'applied migration must be recorded');
      assert.match(pool.inserts[0].checksum, /^[0-9a-f]{64}$/, 'checksum must be recorded');
    },
  );
});

test('FIRES — a migration that ran but produced nothing is NOT marked applied', async () => {
  await withTempMigrations(
    { '20260728_silent.sql': '-- @assert table:never_created\nSELECT 1;\n' },
    async (migrationsDir) => {
      const pool = stubPool({ existingObjects: new Set() });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.equal(result.ran, 0);
      assert.deepEqual(result.failed, ['20260728_silent.sql']);
      assert.equal(result.assertion_failures.length, 1);
      assert.ok(result.assertion_failures[0].proposed_solution.length > 40);
      assert.equal(pool.inserts.length, 0, 'an unproven migration must stay unapplied so it retries');
    },
  );
});

test('FIRES — "already exists" no longer forgives a rolled-back migration', async () => {
  await withTempMigrations(
    { '20260728_rolled_back.sql': '-- @assert column:widgets.added_col\nALTER TABLE widgets ADD COLUMN added_col int;\n' },
    async (migrationsDir) => {
      const pool = stubPool({
        existingObjects: new Set(),
        migrationBehavior: () => { throw new Error('relation "widgets" already exists'); },
      });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.deepEqual(result.failed, ['20260728_rolled_back.sql']);
      assert.equal(pool.inserts.length, 0, 'the whole batch rolled back — must not be recorded applied');
    },
  );
});

test('PASSES — "already exists" is forgiven when the end state is genuinely present', async () => {
  await withTempMigrations(
    { '20260728_idempotent.sql': '-- @assert column:widgets.added_col\nALTER TABLE widgets ADD COLUMN added_col int;\n' },
    async (migrationsDir) => {
      const pool = stubPool({
        existingObjects: new Set(['column:public.widgets.added_col']),
        migrationBehavior: () => { throw new Error('column "added_col" already exists'); },
      });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.deepEqual(result.failed, []);
      assert.equal(pool.inserts.length, 1, 'genuinely idempotent migration is recorded');
    },
  );
});

test('migrations without @assert keep working exactly as before', async () => {
  await withTempMigrations(
    { '20260728_legacy.sql': 'CREATE TABLE legacy (id int);\n' },
    async (migrationsDir) => {
      const pool = stubPool({});
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.equal(result.ran, 1);
      assert.deepEqual(result.failed, []);
      assert.deepEqual(result.unverified_applied, ['20260728_legacy.sql']);
    },
  );
});

test('DETECTS — an applied migration edited after the fact is reported, boot continues', async () => {
  await withTempMigrations(
    { '20260728_edited.sql': 'CREATE TABLE edited (id int, extra text);\n' },
    async (migrationsDir) => {
      const pool = stubPool({
        recorded: [{ filename: '20260728_edited.sql', checksum: checksumMigration('CREATE TABLE edited (id int);\n') }],
      });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.equal(result.skipped, 1);
      assert.equal(result.checksum_drift.length, 1);
      assert.equal(result.checksum_drift[0].filename, '20260728_edited.sql');
      assert.match(result.checksum_drift[0].proposed_solution, /Do not edit applied migrations/);
      assert.deepEqual(result.failed, [], 'drift detects and routes; it must never block boot');
    },
  );
});

test('a pre-checksum row gets its identity backfilled rather than flagged', async () => {
  await withTempMigrations(
    { '20260728_legacy_row.sql': 'CREATE TABLE t (id int);\n' },
    async (migrationsDir) => {
      const pool = stubPool({ recorded: [{ filename: '20260728_legacy_row.sql', checksum: null }] });
      const result = await initDatabase(pool, quietLogger, { migrationsDir });
      assert.equal(result.checksum_drift.length, 0);
      assert.equal(pool.inserts.length, 1, 'checksum backfilled for the legacy row');
    },
  );
});
