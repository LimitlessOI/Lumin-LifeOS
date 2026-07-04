-- SYNOPSIS: Database migration — 20260704_create_outreach_log.sql.
CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_email ON outreach_log (email);
CREATE INDEX IF NOT EXISTS idx_outreach_log_timestamp ON outreach_log (timestamp);