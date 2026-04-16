-- Migration: 20260330_lifeos_health.sql
-- LifeOS Phase 3 — Health Intelligence schema
-- Tables: wearable_data, health_correlations, emergency_events, emergency_contacts

BEGIN;

-- 1. Wearable / HealthKit data points -----------------------------------------
CREATE TABLE IF NOT EXISTS wearable_data (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL DEFAULT 'apple_watch',
    -- 'apple_watch' | 'cgm' | 'manual'
  metric      TEXT NOT NULL,
    -- 'heart_rate' | 'hrv' | 'sleep_deep_min' | 'sleep_rem_min' |
    -- 'sleep_awake_min' | 'steps' | 'active_calories' |
    -- 'glucose_mg_dl' | 'blood_oxygen' | 'respiratory_rate'
  value       NUMERIC NOT NULL,
  unit        TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wearable_data_user_metric_time_idx
  ON wearable_data (user_id, metric, recorded_at DESC);

CREATE INDEX IF NOT EXISTS wearable_data_user_time_idx
  ON wearable_data (user_id, recorded_at DESC);

-- 2. Health correlations (AI-computed weekly) ----------------------------------
CREATE TABLE IF NOT EXISTS health_correlations (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  factor_a      TEXT NOT NULL,   -- e.g. 'sleep_hours'
  factor_b      TEXT NOT NULL,   -- e.g. 'joy_score'
  direction     TEXT,            -- 'positive' | 'negative' | 'none'
  strength      NUMERIC(4,2),    -- 0.0 to 1.0
  observation   TEXT,            -- plain-English description
  based_on_days INTEGER,         -- days of data this is based on
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, factor_a, factor_b)
);

-- 3. Emergency events ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
    -- 'abnormal_hr' | 'fall_detected' | 'absence_pattern' | 'manual'
  triggered_by    TEXT,
  severity        TEXT DEFAULT 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
  alert_chain     JSONB DEFAULT '[]',
  alerts_sent     INTEGER DEFAULT 0,
  resolved        BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emergency_events_user_active_idx
  ON emergency_events (user_id, resolved, created_at DESC);

-- 4. Emergency contacts --------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  relationship TEXT,   -- 'spouse' | 'family' | 'friend' | 'medical'
  priority     INTEGER DEFAULT 1,  -- lower = alert first
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
