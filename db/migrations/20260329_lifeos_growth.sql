-- Migration: 20260329_lifeos_growth.sql
-- Module A: Growth & Mastery (Wisdom Library, 10,000 Hours Tracker, Deliberate Practice)
-- Module B: Relationship Intelligence (Health Score, Apology Engine, Emotional Weather, Family Values)
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Wisdom Library ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wisdom_entries (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  principle            TEXT NOT NULL,
  context              TEXT,
  tags                 TEXT[],
  applicable_situations TEXT[],
  times_surfaced       INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wisdom_entries_user_id_idx ON wisdom_entries(user_id);

-- ── Skill Tracks (10,000 Hours) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill_tracks (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  skill_name           TEXT NOT NULL,
  goal                 TEXT,
  total_hours          NUMERIC(8,2) DEFAULT 0,
  sessions             JSONB DEFAULT '[]',
  plateau_detected     BOOLEAN DEFAULT FALSE,
  plateau_detected_at  TIMESTAMPTZ,
  current_phase        TEXT DEFAULT 'foundation'
                         CHECK (current_phase IN ('foundation','building','plateau','breakthrough','mastery')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skill_tracks_user_id_idx ON skill_tracks(user_id);

-- ── Practice Protocols (Deliberate Practice Design) ───────────────────────────

CREATE TABLE IF NOT EXISTS practice_protocols (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  goal             TEXT NOT NULL,
  skill_track_id   BIGINT REFERENCES skill_tracks(id) ON DELETE SET NULL,
  capacities       JSONB NOT NULL,
  current_week     INTEGER DEFAULT 1,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practice_protocols_user_id_idx ON practice_protocols(user_id);

-- ── Relationship Health Log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS relationship_health_log (
  id                        BIGSERIAL PRIMARY KEY,
  user_id                   BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  relationship_label        TEXT NOT NULL,
  period_start              TIMESTAMPTZ,
  period_end                TIMESTAMPTZ,
  initiation_ratio          NUMERIC(4,2),
  repair_speed_hours        NUMERIC(8,2),
  commitment_followthrough  NUMERIC(4,2),
  deposit_withdrawal_ratio  NUMERIC(4,2),
  health_score              NUMERIC(4,2),
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS relationship_health_log_user_id_idx ON relationship_health_log(user_id);

-- ── Apology Log ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apology_log (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  relationship_label    TEXT NOT NULL,
  incident_description  TEXT,
  apology_text          TEXT NOT NULL,
  quality_score         NUMERIC(4,2),
  components            JSONB,
  outcome               TEXT CHECK (outcome IN ('accepted','partial','pending','rejected')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apology_log_user_id_idx ON apology_log(user_id);

-- ── Emotional Weather Forecasts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  forecast_period_start TIMESTAMPTZ,
  forecast_period_end   TIMESTAMPTZ,
  predicted_state       TEXT CHECK (predicted_state IN ('high_energy','moderate','low_energy','reactive')),
  confidence            NUMERIC(4,2),
  reasons               TEXT[],
  recommendations       TEXT[],
  generated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weather_forecasts_user_id_idx ON weather_forecasts(user_id);

-- ── Family Values ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_values (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  value_name    TEXT NOT NULL,
  description   TEXT,
  how_we_live_this TEXT,
  health_score  NUMERIC(4,2) DEFAULT 5.0,
  last_reviewed TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_values_user_id_idx ON family_values(user_id);

COMMIT;
