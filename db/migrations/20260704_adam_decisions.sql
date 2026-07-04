-- SYNOPSIS: Database migration — 20260704_adam_decisions.sql.
-- Create adam_decisions table for IdeaVault decision data
CREATE TABLE IF NOT EXISTS adam_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ref TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adam_decisions_source_ref
  ON adam_decisions (source_ref);

CREATE INDEX IF NOT EXISTS idx_adam_decisions_owner_id
  ON adam_decisions (owner_id);