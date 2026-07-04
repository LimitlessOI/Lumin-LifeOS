-- SYNOPSIS: Database migration — 20260705_create_emergency_fund_table.sql.
CREATE TABLE IF NOT EXISTS emergency_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_fund_owner_id
  ON emergency_fund (owner_id);