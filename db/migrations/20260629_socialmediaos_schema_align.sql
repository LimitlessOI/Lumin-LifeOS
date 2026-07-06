-- SYNOPSIS: Align socialmediaos tables with services/socialmediaos-service.js column contract.
-- MOS-P1-SCHEMA-ALIGN — fixes POST /sessions 500 (missing scheduled_for, session_id, etc.)

ALTER TABLE socialmediaos_sessions ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE socialmediaos_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE socialmediaos_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE socialmediaos_sessions ADD COLUMN IF NOT EXISTS delivery_error_message TEXT;

ALTER TABLE socialmediaos_content_packs ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE socialmediaos_content_packs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE socialmediaos_content_packs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE socialmediaos_content_packs ADD COLUMN IF NOT EXISTS delivery_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_session_id
  ON socialmediaos_content_packs (session_id);