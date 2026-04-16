-- ============================================================
-- Migration: 20260329_lifeos_decisions.sql
-- Decision Intelligence layer — Ideas 5-8
--   decisions          — Decision Archaeology log
--   second_opinions    — The Second Opinion Engine
--   bias_detections    — Cognitive Bias Detection
--   energy_patterns    — The Energy Calendar
-- ============================================================

BEGIN;

-- ── decisions ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS decisions (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  category              TEXT CHECK (category IN ('financial','relationship','career','health','family','other')),
  decision_made         TEXT,
  alternatives_considered TEXT[],
  context_at_time       JSONB,
  -- context shape: { integrity_score, joy_score, sleep_minutes, hrv, hour_of_day, emotional_state }
  outcome               TEXT,
  outcome_at            TIMESTAMPTZ,
  outcome_rating        INTEGER CHECK (outcome_rating BETWEEN 1 AND 10),
  second_opinion_used   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_user_id     ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_user_cat    ON decisions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_decisions_user_time   ON decisions(user_id, created_at DESC);

-- ── second_opinions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS second_opinions (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  decision_id           BIGINT REFERENCES decisions(id) ON DELETE SET NULL,
  decision_description  TEXT NOT NULL,
  steelman_against      TEXT NOT NULL,
  questions_to_sit_with TEXT[],
  risks_not_considered  TEXT[],
  user_proceeded        BOOLEAN,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_second_opinions_user_id    ON second_opinions(user_id);
CREATE INDEX IF NOT EXISTS idx_second_opinions_decision   ON second_opinions(decision_id);

-- ── bias_detections ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bias_detections (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  bias_type    TEXT NOT NULL CHECK (bias_type IN (
                  'confirmation','sunk_cost','optimism','anchoring',
                  'availability','status_quo','recency'
               )),
  description  TEXT NOT NULL,
  decision_ids BIGINT[],
  frequency    INTEGER NOT NULL DEFAULT 1,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_bias_detections_user_id ON bias_detections(user_id);

-- ── energy_patterns ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS energy_patterns (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  hour_of_day           INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  avg_hrv               NUMERIC(5,2),
  avg_decision_quality  NUMERIC(4,2),
  cognitive_state       TEXT CHECK (cognitive_state IN ('peak','good','neutral','low','reactive')),
  sample_count          INTEGER NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_energy_patterns_user_id ON energy_patterns(user_id);

COMMIT;
