-- SYNOPSIS: Database migration — 20260704_create_user_preference.sql.
-- MS-P1-001: user_preference table for storing user settings
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_preference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preference_owner_id
  ON user_preference (owner_id);

CREATE INDEX IF NOT EXISTS idx_user_preference_owner_id_preference_key
  ON user_preference (owner_id, preference_key);