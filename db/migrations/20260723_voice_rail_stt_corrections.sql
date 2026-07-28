-- SYNOPSIS: Database migration — 20260723_voice_rail_stt_corrections.sql
-- Voice Rail STT — per-user learned vocabulary corrections.
BEGIN;

CREATE TABLE IF NOT EXISTS voice_rail_stt_corrections (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  misheard TEXT NOT NULL,
  canonical TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_rail_stt_corrections_user_misheard
  ON voice_rail_stt_corrections (user_id, LOWER(misheard));

CREATE INDEX IF NOT EXISTS idx_voice_rail_stt_corrections_user
  ON voice_rail_stt_corrections (user_id, created_at DESC);

COMMIT;
