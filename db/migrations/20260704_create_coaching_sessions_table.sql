-- SYNOPSIS: Database migration — 20260704_create_coaching_sessions_table.sql.
CREATE TABLE IF NOT EXISTS coaching_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL,
  consent_record UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_founder_id
  ON coaching_sessions (founder_id);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_consent_record
  ON coaching_sessions (consent_record);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_timestamp
  ON coaching_sessions (timestamp);