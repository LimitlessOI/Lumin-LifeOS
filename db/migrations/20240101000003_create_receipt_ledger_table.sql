-- SYNOPSIS: Database migration — 20240101000003_create_receipt_ledger_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
SELECT to_regclass('public.security_receipt_spine');
DO $$
BEGIN
  IF to_regclass('public.security_receipt_spine') IS NULL THEN
    RAISE NOTICE 'Taloa bind deferred: security_receipt_spine not present yet';
    RETURN;
  END IF;
  EXECUTE format('COMMENT ON TABLE %I IS %L', 'security_receipt_spine', 'Taloa Phase 1 binding target for ReceiptLedger.');
END
$$;
