/**
 * SYNOPSIS: Unit/fixture tests for migration idempotency / data-loss lint (no DB).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hasRenameAllowBanner,
  sliceSqlStatement,
  isNonTableUpdate,
  scanMigrationIdempotency,
  runMigrationIdempotency,
} from '../scripts/verify-migration-idempotency.mjs';

function withTempMigrations(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-idem-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), body);
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('DELETE FROM without WHERE fails; banner allows as warning', () => {
  const bad = scanMigrationIdempotency({
    file: 'a.sql',
    raw: 'DELETE FROM widgets;',
  });
  assert.ok(bad.failures.some((f) => f.code === 'DELETE_WITHOUT_WHERE'));

  const ok = scanMigrationIdempotency({
    file: 'b.sql',
    raw: '-- ALLOW_DESTRUCTIVE_MIGRATION\nDELETE FROM widgets;',
  });
  assert.equal(
    ok.failures.filter((f) => f.code === 'DELETE_WITHOUT_WHERE').length,
    0,
  );
  assert.ok(ok.warnings.some((w) => w.code === 'DELETE_WITHOUT_WHERE_ALLOWED'));
});

test('DELETE FROM with WHERE passes', () => {
  const { failures } = scanMigrationIdempotency({
    file: 'a.sql',
    raw: "DELETE FROM widgets WHERE id = 1;",
  });
  assert.equal(
    failures.filter((f) => f.code === 'DELETE_WITHOUT_WHERE').length,
    0,
  );
});

test('UPDATE without WHERE fails; banner allows; WHERE passes', () => {
  const bad = scanMigrationIdempotency({
    file: 'a.sql',
    raw: "UPDATE widgets SET color = 'red';",
  });
  assert.ok(bad.failures.some((f) => f.code === 'UPDATE_WITHOUT_WHERE'));

  const allowed = scanMigrationIdempotency({
    file: 'b.sql',
    raw: "-- ALLOW_DESTRUCTIVE_MIGRATION\nUPDATE widgets SET color = 'red';",
  });
  assert.equal(
    allowed.failures.filter((f) => f.code === 'UPDATE_WITHOUT_WHERE').length,
    0,
  );

  const good = scanMigrationIdempotency({
    file: 'c.sql',
    raw: "UPDATE widgets SET color = 'red' WHERE id = 1;",
  });
  assert.equal(
    good.failures.filter((f) => f.code === 'UPDATE_WITHOUT_WHERE').length,
    0,
  );
});

test('ON CONFLICT DO UPDATE and BEFORE UPDATE ON are not table UPDATEs', () => {
  const sql = `
INSERT INTO t (label) VALUES ('x')
ON CONFLICT (label) DO UPDATE
  SET token_count = EXCLUDED.token_count;

CREATE TRIGGER trg BEFORE UPDATE ON widgets
FOR EACH ROW EXECUTE FUNCTION touch();
`;
  const { failures } = scanMigrationIdempotency({ file: 'a.sql', raw: sql });
  assert.equal(
    failures.filter((f) => f.code === 'UPDATE_WITHOUT_WHERE').length,
    0,
  );
  assert.equal(isNonTableUpdate(sql, sql.indexOf('UPDATE')), true);
});

test('DROP COLUMN without IF EXISTS fails; with IF EXISTS passes', () => {
  const bad = scanMigrationIdempotency({
    file: 'a.sql',
    raw: 'ALTER TABLE widgets DROP COLUMN color;',
  });
  assert.ok(bad.failures.some((f) => f.code === 'DROP_COLUMN_MISSING_IF_EXISTS'));

  const good = scanMigrationIdempotency({
    file: 'b.sql',
    raw: 'ALTER TABLE widgets DROP COLUMN IF EXISTS color;',
  });
  assert.equal(
    good.failures.filter((f) => f.code === 'DROP_COLUMN_MISSING_IF_EXISTS').length,
    0,
  );
});

test('ALTER COLUMN TYPE without USING fails; with USING passes', () => {
  const bad = scanMigrationIdempotency({
    file: 'a.sql',
    raw: 'ALTER TABLE widgets ALTER COLUMN id TYPE TEXT;',
  });
  assert.ok(bad.failures.some((f) => f.code === 'ALTER_COLUMN_TYPE_MISSING_USING'));

  const good = scanMigrationIdempotency({
    file: 'b.sql',
    raw: 'ALTER TABLE widgets ALTER COLUMN id TYPE TEXT USING id::TEXT;',
  });
  assert.equal(
    good.failures.filter((f) => f.code === 'ALTER_COLUMN_TYPE_MISSING_USING')
      .length,
    0,
  );
});

test('RENAME warns unless ALLOW_RENAME_MIGRATION banner', () => {
  assert.equal(hasRenameAllowBanner('-- ALLOW_RENAME_MIGRATION\nx'), true);

  const warn = scanMigrationIdempotency({
    file: 'a.sql',
    raw: 'ALTER TABLE widgets RENAME COLUMN color TO colour;',
  });
  assert.equal(warn.failures.length, 0);
  assert.ok(warn.warnings.some((w) => w.code === 'RENAME_WITHOUT_ALLOW_BANNER'));

  const allowed = scanMigrationIdempotency({
    file: 'b.sql',
    raw: '-- ALLOW_RENAME_MIGRATION\nALTER TABLE widgets RENAME TO gadgets;',
  });
  assert.ok(allowed.warnings.some((w) => w.code === 'RENAME_ALLOWED'));
  assert.equal(
    allowed.warnings.filter((w) => w.code === 'RENAME_WITHOUT_ALLOW_BANNER')
      .length,
    0,
  );
});

test('INSERT without ON CONFLICT warns only', () => {
  const { failures, warnings } = scanMigrationIdempotency({
    file: 'a.sql',
    raw: "INSERT INTO widgets (id) VALUES (1);",
  });
  assert.equal(failures.length, 0);
  assert.ok(warnings.some((w) => w.code === 'INSERT_MISSING_ON_CONFLICT'));

  const withConflict = scanMigrationIdempotency({
    file: 'b.sql',
    raw: 'INSERT INTO widgets (id) VALUES (1) ON CONFLICT DO NOTHING;',
  });
  assert.equal(
    withConflict.warnings.filter((w) => w.code === 'INSERT_MISSING_ON_CONFLICT')
      .length,
    0,
  );
});

test('sliceSqlStatement stops at top-level semicolon inside strings', () => {
  const sql = "UPDATE t SET note = 'a;b' WHERE id = 1; DELETE FROM t;";
  const stmt = sliceSqlStatement(sql, 0);
  assert.match(stmt, /WHERE id = 1$/);
  assert.doesNotMatch(stmt, /DELETE/);
});

test('runMigrationIdempotency fails closed on unsafe fixture; skips empty', () => {
  withTempMigrations(
    {
      'empty.sql': '  \n',
      'bad.sql': 'DELETE FROM widgets;\nUPDATE widgets SET x = 1;',
      'ok.sql': "UPDATE widgets SET x = 1 WHERE id = 1;",
    },
    (dir) => {
      const result = runMigrationIdempotency({ migrationsDir: dir });
      assert.equal(result.ok, false);
      assert.equal(result.scanned, 2);
      assert.ok(result.failures.some((f) => f.code === 'DELETE_WITHOUT_WHERE'));
      assert.ok(result.failures.some((f) => f.code === 'UPDATE_WITHOUT_WHERE'));
    },
  );
});
