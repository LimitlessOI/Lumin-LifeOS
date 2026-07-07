-- SYNOPSIS: Database migration — 20260629_socialmediaos_schema_align.sql.
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