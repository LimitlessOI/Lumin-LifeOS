-- SYNOPSIS: Database migration — 20260704_create_crm_sequences.sql.
-- Create CRM sequences table for managing outreach sequences

CREATE TABLE IF NOT EXISTS crm_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support efficient lookup by name for outreach sequence management
CREATE INDEX IF NOT EXISTS idx_crm_sequences_name
  ON crm_sequences (name);