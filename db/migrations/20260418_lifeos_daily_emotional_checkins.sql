-- Migration: 20260418_lifeos_daily_emotional_checkins.sql
-- LifeOS Phase 5 — Daily Emotional Check-in capture table
--
-- Captures the daily "emotional weather" ritual described in Amendment 21
-- Layer 5 ("Emotional Intelligence"): ONE weather word, ONE intensity number,
-- optional depletion tags, optional note. This is the data source that feeds
-- the emotional-pattern-engine, early-warning notifications, joy score, and
-- truth-delivery calibration. Without this table the engine is starved.
--
-- Design notes:
--   - One check-in per user per calendar date is allowed; subsequent entries
--     on the same date OVERWRITE (upsert), because this is a "most recent
--     reading today" surface, not a journal.
--   - `weather` uses an open vocabulary (no enum); we let the UI suggest
--     common weather words but the person can type anything.
--   - `intensity` is 1-10 (low to high intensity of the feeling, NOT
--     positive/negative).
--   - `valence` is -5..+5 (negative..positive) so we can correlate the same
--     intensity at different polarities.
--   - `depletion_tags` is a string array aligned with the Amendment 21
--     backlog item "Depletion taxonomy" (people/pace/meaning/body/money).
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

CREATE TABLE IF NOT EXISTS daily_emotional_checkins (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT      NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  weather          TEXT        NOT NULL,          -- open vocab: "stormy", "clear", "heavy", etc.
  intensity        INTEGER     NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  valence          INTEGER     CHECK (valence BETWEEN -5 AND 5),
  depletion_tags   TEXT[]      DEFAULT '{}',     -- ['people','pace','meaning','body','money','other']
  note             TEXT,
  somatic_note     TEXT,                           -- optional body scan micro-signal
  source           TEXT        DEFAULT 'overlay', -- 'overlay'|'sms'|'voice'|'quick_entry'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_emotional_checkins_user_date
  ON daily_emotional_checkins (user_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_emotional_checkins_recent
  ON daily_emotional_checkins (user_id, created_at DESC);

-- Standard updated_at touch trigger reused across LifeOS tables
CREATE OR REPLACE FUNCTION daily_emotional_checkins_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_emotional_checkins_touch ON daily_emotional_checkins;
CREATE TRIGGER trg_daily_emotional_checkins_touch
  BEFORE UPDATE ON daily_emotional_checkins
  FOR EACH ROW EXECUTE FUNCTION daily_emotional_checkins_touch_updated_at();

COMMIT;
