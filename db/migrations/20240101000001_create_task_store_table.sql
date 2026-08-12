-- SYNOPSIS: Database migration — 20240101000001_create_task_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
-- Bind-only. Dated 20240101 so it can run BEFORE lifeos_tasks exists
-- (created 20260723). Missing table is a deferral, not a boot failure.
SELECT to_regclass('public.lifeos_tasks');
DO $$
BEGIN
  IF to_regclass('public.lifeos_tasks') IS NULL THEN
    RAISE NOTICE 'Taloa bind deferred: lifeos_tasks not present yet';
    RETURN;
  END IF;
  EXECUTE format('COMMENT ON TABLE %I IS %L', 'lifeos_tasks', 'Taloa Phase 1 binding target for TaskStore.');
END
$$;
