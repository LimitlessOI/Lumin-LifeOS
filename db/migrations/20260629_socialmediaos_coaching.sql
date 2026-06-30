-- SYNOPSIS: Database migration — 20260629_socialmediaos_coaching.sql
-- Adds coaching columns to socialmediaos_sessions and content to socialmediaos_content_packs

-- Convert owner_id from UUID to TEXT (new coaching flow uses TEXT owner IDs from JWT sub or test strings)
ALTER TABLE socialmediaos_sessions
  ALTER COLUMN owner_id TYPE TEXT USING owner_id::TEXT;

ALTER TABLE socialmediaos_content_packs
  ALTER COLUMN owner_id TYPE TEXT USING owner_id::TEXT;

ALTER TABLE socialmediaos_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'text_coaching',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE socialmediaos_content_packs
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES socialmediaos_sessions(id),
  ADD COLUMN IF NOT EXISTS content JSONB;

CREATE INDEX IF NOT EXISTS idx_smos_sessions_type ON socialmediaos_sessions (session_type);
CREATE INDEX IF NOT EXISTS idx_smos_content_packs_session ON socialmediaos_content_packs (session_id);
