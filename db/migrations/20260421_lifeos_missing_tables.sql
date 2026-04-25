-- 20260421_lifeos_missing_tables.sql
-- Creates tables referenced in services but missing from migrations:
--   user_preferences  — key/value store for per-user settings (phone, escalation policy, etc.)
--   health_readings   — wearable/manual health metrics (HRV, sleep, steps)
--   lifeos_notes      — freeform notes created by weekly review and other services
--   lifeos_priorities — per-area priority levels set by weekly review
--   lifeos_events     — calendar events created by weekly review AI actions

-- Key/value preferences store
CREATE TABLE IF NOT EXISTS user_preferences (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    BIGINT       NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  key        TEXT         NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Wearable / manual health readings (HRV, sleep, steps)
CREATE TABLE IF NOT EXISTS health_readings (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     BIGINT       NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  hrv_ms      NUMERIC(6,1),
  sleep_hours NUMERIC(4,2),
  steps       INTEGER,
  source      TEXT         NOT NULL DEFAULT 'manual',
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS health_readings_user_date_idx ON health_readings(user_id, recorded_at);

-- Freeform notes (created by weekly review, coaching, etc.)
CREATE TABLE IF NOT EXISTS lifeos_notes (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    BIGINT       NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  content    TEXT         NOT NULL,
  source     TEXT         NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lifeos_notes_user_idx ON lifeos_notes(user_id, created_at DESC);

-- Per-area priorities (one row per user+area, upserted by weekly review)
CREATE TABLE IF NOT EXISTS lifeos_priorities (
  id             BIGSERIAL    PRIMARY KEY,
  user_id        BIGINT       NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  area           TEXT         NOT NULL,
  priority_level TEXT         NOT NULL DEFAULT 'medium',
  notes          TEXT,
  source         TEXT         NOT NULL DEFAULT 'manual',
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, area)
);
CREATE INDEX IF NOT EXISTS lifeos_priorities_user_idx ON lifeos_priorities(user_id);

-- Lightweight calendar events (created by AI action plans, weekly review, etc.)
CREATE TABLE IF NOT EXISTS lifeos_events (
  id               BIGSERIAL    PRIMARY KEY,
  user_id          BIGINT       NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  start_time       TIMESTAMPTZ  NOT NULL,
  duration_minutes INTEGER      NOT NULL DEFAULT 60,
  source           TEXT         NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lifeos_events_user_time_idx ON lifeos_events(user_id, start_time);
