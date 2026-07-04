-- SYNOPSIS: Database migration — 20260704_create_email_suppressions.sql.
-- OCR-P1-007: email suppression list
CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_email
  ON email_suppressions (email);