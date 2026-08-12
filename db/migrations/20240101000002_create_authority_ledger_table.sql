-- SYNOPSIS: Database migration — 20240101000002_create_authority_ledger_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.agent_task_authority') IS NULL THEN
        RAISE EXCEPTION 'Binding target table public.agent_task_authority does not exist. AuthorityLedger cannot be bound.';
    END IF;
END
$$;

COMMENT ON TABLE agent_task_authority IS 'This table is the Taloa Phase 1 binding target for the AuthorityLedger store.';