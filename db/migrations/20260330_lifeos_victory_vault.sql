-- Migration: 20260330_lifeos_victory_vault.sql
-- LifeOS Growth extension: Victory Vault / Identity Evidence Engine
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

CREATE TABLE IF NOT EXISTS victory_moments (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  moment_type       TEXT NOT NULL DEFAULT 'other'
                     CHECK (moment_type IN ('courage','discipline','repair','breakthrough','goal','integrity','health','parenting','business','faith','other')),
  what_was_hard     TEXT,
  what_you_did      TEXT NOT NULL,
  what_it_proves    TEXT,
  outcome_summary   TEXT,
  emotional_before  TEXT,
  emotional_after   TEXT,
  goal_link         TEXT,
  media_type        TEXT NOT NULL DEFAULT 'text'
                     CHECK (media_type IN ('audio','video','text','image','mixed')),
  media_url         TEXT,
  transcript        TEXT,
  source_type       TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source_type IN ('manual','voice_note','video_clip','imported')),
  playback_weight   NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS victory_moments_user_id_idx ON victory_moments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS victory_moments_user_type_idx ON victory_moments(user_id, moment_type, created_at DESC);

CREATE TABLE IF NOT EXISTS victory_reels (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  purpose            TEXT,
  selected_moment_ids BIGINT[] NOT NULL DEFAULT '{}',
  narration_script   TEXT,
  scene_plan         JSONB NOT NULL DEFAULT '[]',
  render_prompt      TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','ready','rendered')),
  storage_url        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS victory_reels_user_id_idx ON victory_reels(user_id, created_at DESC);

COMMIT;
