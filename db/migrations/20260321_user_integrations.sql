-- Migration: 20260321_user_integrations
-- Stores OAuth2 tokens for third-party integrations (Google Calendar, etc.)

BEGIN;

CREATE TABLE IF NOT EXISTS user_integrations (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'adam',
  provider    TEXT NOT NULL,               -- 'google_calendar', 'apple_calendar', etc.
  tokens      JSONB NOT NULL,              -- OAuth2 token object (access_token, refresh_token, expiry_date)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON user_integrations (user_id, provider);

COMMIT;
