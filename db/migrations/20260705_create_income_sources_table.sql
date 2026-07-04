-- SYNOPSIS: Database migration — 20260705_create_income_sources_table.sql.
-- PFO-P1-001
-- Create table to store user income sources

CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_sources_owner_id ON income_sources (owner_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_created_at ON income_sources (created_at);