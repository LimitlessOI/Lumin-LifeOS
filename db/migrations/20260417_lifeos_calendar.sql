-- Migration: 20260417_lifeos_calendar
-- Native LifeOS calendar domain plus external provider sync scaffolding.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

CREATE TABLE IF NOT EXISTS lifeos_calendars (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'lifeos',
  provider_calendar_id TEXT NOT NULL,
  name                TEXT NOT NULL,
  lane                TEXT NOT NULL DEFAULT 'personal',
  color               TEXT,
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  sync_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at      TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, provider_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_lifeos_calendars_user ON lifeos_calendars (user_id, active, provider);

CREATE TABLE IF NOT EXISTS lifeos_calendar_events (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  calendar_id       BIGINT NOT NULL REFERENCES lifeos_calendars(id) ON DELETE CASCADE,
  source            TEXT NOT NULL DEFAULT 'manual',
  provider_event_id TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  location          TEXT,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  all_day           BOOLEAN NOT NULL DEFAULT FALSE,
  lane              TEXT NOT NULL DEFAULT 'personal',
  status            TEXT NOT NULL DEFAULT 'confirmed',
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (calendar_id, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_lifeos_calendar_events_user_time
  ON lifeos_calendar_events (user_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_lifeos_calendar_events_lane
  ON lifeos_calendar_events (user_id, lane, starts_at);

CREATE OR REPLACE FUNCTION update_lifeos_calendar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifeos_calendars_updated ON lifeos_calendars;
CREATE TRIGGER trg_lifeos_calendars_updated
  BEFORE UPDATE ON lifeos_calendars
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_calendar_updated_at();

DROP TRIGGER IF EXISTS trg_lifeos_calendar_events_updated ON lifeos_calendar_events;
CREATE TRIGGER trg_lifeos_calendar_events_updated
  BEFORE UPDATE ON lifeos_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_calendar_updated_at();

COMMIT;
