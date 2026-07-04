-- SYNOPSIS: Database migration — 20260705_create_operator_consumption_ledger.sql.
-- ZDHP-P1-001: operator consumption ledger
CREATE TABLE IF NOT EXISTS operator_consumption_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_token TEXT NOT NULL,
  shipped_code_day TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_consumption_ledger_work_token
  ON operator_consumption_ledger (work_token);

CREATE INDEX IF NOT EXISTS idx_operator_consumption_ledger_shipped_code_day
  ON operator_consumption_ledger (shipped_code_day);