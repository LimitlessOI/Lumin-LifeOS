-- SYNOPSIS: Database migration — 20260705_create_financial_ledger.sql.
-- Financial Revenue blueprint FR-P1-001
-- Create financial_ledger table to track financial transactions.

CREATE TABLE IF NOT EXISTS financial_ledger (
  tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD'
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_owner_id
  ON financial_ledger (owner_id);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_at
  ON financial_ledger (created_at);