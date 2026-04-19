-- Migration: 20260418_lifeos_daily_scorecard
-- LifeOS Daily Scorecard + Most Important Tasks (MITs)
--
-- Every day has three Most Important Tasks — the non-negotiables.
-- The system scores your day based on MITs completed, commitments hit,
-- joy logged, integrity signals, and deferred items. One number. Honest.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Most Important Tasks (MITs) ───────────────────────────────────────────────
-- Three per day. Set in the morning. Reviewed in the evening.
-- These are NOT the same as commitments — they are the top 3 things that
-- would make today count regardless of everything else.
CREATE TABLE IF NOT EXISTS daily_mits (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  mit_date     DATE NOT NULL,
  position     INT NOT NULL CHECK (position IN (1, 2, 3)),  -- 1 = most critical
  title        TEXT NOT NULL,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'done', 'deferred', 'dropped')),
  deferred_to  DATE,         -- if deferred, when it moves to
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mit_date, position)
);

CREATE INDEX IF NOT EXISTS idx_daily_mits_user_date ON daily_mits(user_id, mit_date DESC);

-- ── Daily Scorecard ───────────────────────────────────────────────────────────
-- Computed once per day (evening, or on demand). Combines MITs, commitments,
-- joy, integrity signals, and deferred count into a single 0–100 score.
-- Stored so history is queryable without recomputing.
CREATE TABLE IF NOT EXISTS daily_scorecards (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  scorecard_date  DATE NOT NULL,
  score           INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade           TEXT NOT NULL,   -- A/B/C/D/F — derived from score
  breakdown       JSONB NOT NULL,  -- { mits, commitments, joy, integrity, deferred }
  narrative       TEXT,            -- AI-written one-paragraph honest read of the day
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, scorecard_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_scorecards_user ON daily_scorecards(user_id, scorecard_date DESC);

-- ── Task deferrals log ────────────────────────────────────────────────────────
-- Tracks everything put off: MITs deferred, commitments snoozed.
-- The system watches for chronic deferral patterns on the same item.
CREATE TABLE IF NOT EXISTS task_deferrals (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  item_type     TEXT NOT NULL CHECK (item_type IN ('mit', 'commitment')),
  item_id       BIGINT NOT NULL,
  item_title    TEXT NOT NULL,
  deferred_from DATE NOT NULL,
  deferred_to   DATE,
  deferral_count INT NOT NULL DEFAULT 1,   -- increments each time same item is deferred again
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deferrals_user ON task_deferrals(user_id, deferred_from DESC);

COMMIT;
