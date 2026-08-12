-- SYNOPSIS: Database migration — 20240101000001_create_task_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.lifeos_tasks') IS NULL THEN
        RAISE EXCEPTION 'Binding target table "lifeos_tasks" does not exist. This migration requires its presence.';
    END IF;
END
$$;

COMMENT ON TABLE lifeos_tasks IS 'Taloa Phase 1 binding target for TaskStore.';