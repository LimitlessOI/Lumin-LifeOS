-- SYNOPSIS: Database migration — 20260704_create_claims_table.sql.
-- CBR-P1-001: claims table for imported claim data

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  payer TEXT,
  age INT,
  rescueability TEXT,
  actions_needed JSONB
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
CREATE INDEX IF NOT EXISTS idx_claims_payer ON claims (payer);
CREATE INDEX IF NOT EXISTS idx_claims_age ON claims (age);
CREATE INDEX IF NOT EXISTS idx_claims_rescueability ON claims (rescueability);