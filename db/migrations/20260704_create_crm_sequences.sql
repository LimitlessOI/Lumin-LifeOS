-- SYNOPSIS: Database migration — 20260704_create_crm_sequences.sql.
-- OCR-P1-002: CRM sequences table for managing outreach sequences

CREATE TABLE IF NOT EXISTS crm_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_sequences_created_at
  ON crm_sequences (created_at);