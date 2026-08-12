-- SYNOPSIS: Database migration — 20240101000004_create_capsule_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
SELECT to_regclass('public.memory_capsules');
DO $$
BEGIN
  IF to_regclass('public.memory_capsules') IS NULL THEN
    RAISE NOTICE 'Taloa bind deferred: memory_capsules not present yet';
    RETURN;
  END IF;
  EXECUTE format('COMMENT ON TABLE %I IS %L', 'memory_capsules', 'Taloa Phase 1 binding target for CapsuleStore.');
END
$$;
