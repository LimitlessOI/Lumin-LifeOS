-- SYNOPSIS: Database migration — 20240101000003_create_receipt_ledger_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
DO $$
BEGIN
    IF to_regclass('public.security_receipt_spine') IS NULL THEN
        RAISE EXCEPTION 'Binding target table public.security_receipt_spine does not exist. This migration cannot proceed.';
    END IF;
END
$$;

COMMENT ON TABLE security_receipt_spine IS 'This table is the Taloa Phase 1 binding target for ReceiptLedger.';