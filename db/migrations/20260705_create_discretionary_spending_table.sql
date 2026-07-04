-- SYNOPSIS: Database migration — 20260705_create_discretionary_spending_table.sql.
-- Create discretionary spending categories table for Personal Finance OS

CREATE TABLE IF NOT EXISTS discretionary_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  category TEXT NOT NULL,
  budget NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discretionary_spending_owner_id
  ON discretionary_spending (owner_id);