-- SYNOPSIS: Database migration — 20240101000004_create_capsule_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.memory_capsules') IS NULL THEN
        RAISE EXCEPTION 'Binding target table "public.memory_capsules" does not exist. CapsuleStore requires this table to be present.';
    END IF;
END
$$;

COMMENT ON TABLE memory_capsules IS 'Taloa Phase 1 binding target for CapsuleStore.';