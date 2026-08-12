-- SYNOPSIS: Database migration — 20240101000002_create_authority_ledger_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
SELECT to_regclass('public.agent_task_authority');
DO $$
BEGIN
  IF to_regclass('public.agent_task_authority') IS NULL THEN
    RAISE NOTICE 'Taloa bind deferred: agent_task_authority not present yet';
    RETURN;
  END IF;
  EXECUTE format('COMMENT ON TABLE %I IS %L', 'agent_task_authority', 'Taloa Phase 1 binding target for AuthorityLedger.');
END
$$;
