-- SYNOPSIS: Database migration — 20260705_create_security_receipts.sql.
CREATE TABLE IF NOT EXISTS security_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  security_finding_receipt TEXT NOT NULL,
  severity TEXT NOT NULL,
  repro_steps TEXT NOT NULL,
  exact_fix_target TEXT NOT NULL,
  proof_limits TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_receipts_owner_id
  ON security_receipts (owner_id);