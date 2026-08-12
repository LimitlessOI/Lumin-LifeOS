/**
 * SYNOPSIS: js — tests/repair-bind-migration.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBindBeforeCreateFailure,
  needsBindMigrationRepair,
  repairBindMigrationSql,
  classifyHealthRepair,
} from '../scripts/lib/repair-bind-migration.mjs';

test('classifies the live boot error', () => {
  assert.equal(
    isBindBeforeCreateFailure('Binding target table "lifeos_tasks" does not exist. This migration requires its presence.'),
    true,
  );
  assert.equal(isBindBeforeCreateFailure('syntax error'), false);
});

test('rewrites RAISE EXCEPTION bind migrations so missing tables cannot crash boot', () => {
  const src = `-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.lifeos_tasks') IS NULL THEN
        RAISE EXCEPTION 'Binding target table "lifeos_tasks" does not exist. This migration requires its presence.';
    END IF;
END
$$;

COMMENT ON TABLE lifeos_tasks IS 'Taloa Phase 1 binding target for TaskStore.';
`;
  assert.equal(needsBindMigrationRepair(src), true);
  const { changed, sql } = repairBindMigrationSql(src);
  assert.equal(changed, true);
  assert.equal(/RAISE EXCEPTION/.test(sql), false);
  assert.match(sql, /RAISE NOTICE/);
  assert.match(sql, /EXECUTE format\('COMMENT ON TABLE %I IS %L'/);
  assert.equal(needsBindMigrationRepair(sql), false);
});

test('watchdog health with migrations_failed maps to the bind-migration playbook', () => {
  const classified = classifyHealthRepair({
    httpOk: true,
    body: { startup: { startup_report: { reasons: ['migrations_failed:1'], migrations_failed: ['20240101000001_create_task_store_table.sql'] } } },
  });
  assert.equal(classified.repair_id, 'DR-BIND-MIGRATION');
  assert.deepEqual(classified.migrations_failed, ['20240101000001_create_task_store_table.sql']);
  assert.equal(classifyHealthRepair({ httpOk: true, body: { startup: { startup_report: { reasons: [] } } } }), null);
});
