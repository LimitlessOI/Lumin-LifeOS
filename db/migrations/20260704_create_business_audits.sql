-- SYNOPSIS: Database migration — 20260704_create_business_audits.sql.
CREATE TABLE IF NOT EXISTS business_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stack JSONB NOT NULL,
  vendor_auth JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_audits_created_at
  ON business_audits (created_at);