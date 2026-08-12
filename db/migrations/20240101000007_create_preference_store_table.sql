-- SYNOPSIS: Database migration — 20240101000007_create_preference_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.user_preferences') IS NULL THEN
        RAISE EXCEPTION 'Binding target table "user_preferences" does not exist. PreferenceStore cannot be bound.';
    END IF;
END
$$;

COMMENT ON TABLE user_preferences IS 'Taloa Phase 1 binding target for PreferenceStore.';