/**
 * SYNOPSIS: Unit/fixture tests for migration pre-flight validator (no DB).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  stripSqlComments,
  parseSqlIdent,
  bareTableName,
  hasDestructiveAllowBanner,
  hasToRegclassGuard,
  scanMigrationSql,
  findCreateTableCollisions,
  runMigrationPreflight,
} from '../scripts/verify-migration-preflight.mjs';

function withTempMigrations(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-preflight-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), body);
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('stripSqlComments ignores CREATE TABLE mentioned only in comments', () => {
  const sql = `-- CREATE TABLE foo (id int);\nCREATE TABLE IF NOT EXISTS bar (id int);`;
  const stripped = stripSqlComments(sql);
  assert.doesNotMatch(stripped, /\bfoo\b/);
  assert.match(stripped, /CREATE TABLE IF NOT EXISTS bar/i);
});

test('parseSqlIdent + bareTableName handle quoted and schema-qualified names', () => {
  assert.equal(parseSqlIdent('"User_Data"'), 'user_data');
  assert.equal(parseSqlIdent('public.habits'), 'public.habits');
  assert.equal(bareTableName('public.habits'), 'habits');
});

test('CREATE TABLE without IF NOT EXISTS fails', () => {
  const { failures } = scanMigrationSql({
    file: 'a.sql',
    raw: 'CREATE TABLE widgets (id int);',
  });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].code, 'CREATE_TABLE_MISSING_IF_NOT_EXISTS');
});

test('CREATE TABLE IF NOT EXISTS passes create-table rule', () => {
  const { failures } = scanMigrationSql({
    file: 'a.sql',
    raw: 'CREATE TABLE IF NOT EXISTS widgets (id int);',
  });
  assert.equal(
    failures.filter((f) => f.code === 'CREATE_TABLE_MISSING_IF_NOT_EXISTS').length,
    0,
  );
});

test('CREATE TABLE with no literal IF NOT EXISTS but guarded by a to_regclass IS NULL check inside a DO block does NOT fail (real pattern, 20260719b_lifeos_lab_results_repair.sql)', () => {
  const sql = `
DO $$
BEGIN
  IF to_regclass('public.lab_results') IS NULL THEN
    CREATE TABLE lab_results (id UUID PRIMARY KEY);
    RETURN;
  END IF;
END $$;`;
  const { failures } = scanMigrationSql({ file: 'a.sql', raw: sql });
  assert.equal(
    failures.filter((f) => f.code === 'CREATE_TABLE_MISSING_IF_NOT_EXISTS').length,
    0,
  );
});

test('CREATE TABLE with no IF NOT EXISTS and no to_regclass guard still fails, even inside an unrelated DO block', () => {
  const sql = `
DO $$
BEGIN
  IF to_regclass('public.some_other_table') IS NULL THEN
    RAISE NOTICE 'unrelated';
  END IF;
  CREATE TABLE widgets (id int);
END $$;`;
  const { failures } = scanMigrationSql({ file: 'a.sql', raw: sql });
  assert.equal(
    failures.filter((f) => f.code === 'CREATE_TABLE_MISSING_IF_NOT_EXISTS').length,
    1,
  );
});

test('hasToRegclassGuard: false when there is no enclosing DO block at all', () => {
  const sql = 'CREATE TABLE widgets (id int);';
  const idx = sql.indexOf('CREATE TABLE');
  assert.equal(hasToRegclassGuard(sql, idx, 'widgets'), false);
});

test('hasToRegclassGuard: false when the guard is for a DIFFERENT table name', () => {
  const sql = `DO $$ BEGIN IF to_regclass('public.other_table') IS NULL THEN CREATE TABLE widgets (id int); END IF; END $$;`;
  const idx = sql.indexOf('CREATE TABLE');
  assert.equal(hasToRegclassGuard(sql, idx, 'widgets'), false);
});

test('CREATE INDEX / UNIQUE INDEX without IF NOT EXISTS fails', () => {
  const { failures: a } = scanMigrationSql({
    file: 'a.sql',
    raw: 'CREATE INDEX idx_w ON widgets(id);',
  });
  assert.ok(a.some((f) => f.code === 'CREATE_INDEX_MISSING_IF_NOT_EXISTS'));

  const { failures: b } = scanMigrationSql({
    file: 'b.sql',
    raw: 'CREATE UNIQUE INDEX idx_w ON widgets(id);',
  });
  assert.ok(b.some((f) => f.code === 'CREATE_INDEX_MISSING_IF_NOT_EXISTS'));

  const { failures: c } = scanMigrationSql({
    file: 'c.sql',
    raw: 'CREATE INDEX IF NOT EXISTS idx_w ON widgets(id);',
  });
  assert.equal(
    c.filter((f) => f.code === 'CREATE_INDEX_MISSING_IF_NOT_EXISTS').length,
    0,
  );
});

test('DROP TABLE / TRUNCATE fail without allow banner; pass with banner', () => {
  const drop = scanMigrationSql({
    file: 'd.sql',
    raw: 'DROP TABLE IF EXISTS widgets;',
  });
  assert.ok(drop.failures.some((f) => f.code === 'DROP_WITHOUT_ALLOW_BANNER'));

  const trunc = scanMigrationSql({
    file: 't.sql',
    raw: 'TRUNCATE widgets;',
  });
  assert.ok(trunc.failures.some((f) => f.code === 'TRUNCATE_WITHOUT_ALLOW_BANNER'));

  const allowed = scanMigrationSql({
    file: 'ok.sql',
    raw: '-- ALLOW_DESTRUCTIVE_MIGRATION\nDROP TABLE IF EXISTS widgets;\nTRUNCATE widgets;',
  });
  assert.equal(
    allowed.failures.filter((f) =>
      ['DROP_WITHOUT_ALLOW_BANNER', 'TRUNCATE_WITHOUT_ALLOW_BANNER'].includes(f.code),
    ).length,
    0,
  );
  assert.equal(hasDestructiveAllowBanner('-- ALLOW_DESTRUCTIVE_MIGRATION\nx'), true);
});

test('ALTER TABLE ADD COLUMN without IF NOT EXISTS warns only', () => {
  const { failures, warnings } = scanMigrationSql({
    file: 'a.sql',
    raw: 'ALTER TABLE widgets ADD COLUMN color text;',
  });
  assert.equal(failures.length, 0);
  assert.ok(warnings.some((w) => w.code === 'ALTER_ADD_COLUMN_MISSING_IF_NOT_EXISTS'));
});

test('duplicate CREATE TABLE across files is COLLISION_RISK', () => {
  const collisions = findCreateTableCollisions([
    { file: '20260101_a.sql', raw: 'CREATE TABLE IF NOT EXISTS widgets (id int);' },
    { file: '20260102_b.sql', raw: 'CREATE TABLE IF NOT EXISTS widgets (id int, name text);' },
  ]);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].table, 'widgets');
  assert.equal(collisions[0].first_file, '20260101_a.sql');
  assert.equal(collisions[0].second_file, '20260102_b.sql');
});

test('runMigrationPreflight skips empty files and uses allowlist', () => {
  withTempMigrations(
    {
      'empty.sql': '   \n',
      '20260101_a.sql': 'CREATE TABLE IF NOT EXISTS widgets (id int);',
      '20260102_b.sql': 'CREATE TABLE IF NOT EXISTS widgets (id int);',
      '20260103_c.sql': 'CREATE TABLE IF NOT EXISTS gadgets (id int);',
    },
    (dir) => {
      const allowPath = path.join(dir, 'allow.json');
      fs.writeFileSync(
        allowPath,
        JSON.stringify({
          pairs: [
            {
              table: 'widgets',
              first_file: '20260101_a.sql',
              second_file: '20260102_b.sql',
            },
          ],
        }),
      );

      const blocked = runMigrationPreflight({
        migrationsDir: dir,
        allowlistPath: null,
      });
      assert.equal(blocked.ok, false);
      assert.ok(
        blocked.failures.some(
          (f) => f.code === 'CREATE_TABLE_COLLISION_RISK' && f.table === 'widgets',
        ),
      );

      const allowed = runMigrationPreflight({
        migrationsDir: dir,
        allowlistPath: allowPath,
      });
      assert.equal(allowed.ok, true);
      assert.equal(allowed.scanned, 3);
    },
  );
});

test('runMigrationPreflight fails closed on unsafe CREATE INDEX fixture', () => {
  withTempMigrations(
    {
      'bad.sql': 'CREATE TABLE IF NOT EXISTS t (id int);\nCREATE INDEX idx_t ON t(id);',
    },
    (dir) => {
      const result = runMigrationPreflight({
        migrationsDir: dir,
        allowlistPath: null,
      });
      assert.equal(result.ok, false);
      assert.ok(result.failures.some((f) => f.code === 'CREATE_INDEX_MISSING_IF_NOT_EXISTS'));
    },
  );
});
