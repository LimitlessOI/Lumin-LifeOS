-- SYNOPSIS: Database migration — 20240101000007_create_preference_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
SELECT to_regclass('public.user_preferences');
DO $$
BEGIN
  IF to_regclass('public.user_preferences') IS NULL THEN
    RAISE NOTICE 'Taloa bind deferred: user_preferences not present yet';
    RETURN;
  END IF;
  EXECUTE format('COMMENT ON TABLE %I IS %L', 'user_preferences', 'Taloa Phase 1 binding target for PreferenceStore.');
END
$$;
