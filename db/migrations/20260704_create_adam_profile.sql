-- SYNOPSIS: Database migration — 20260704_create_adam_profile.sql.
-- LC-P1-003: adam_profile table for storing decision profiles
-- Product: Life Coaching
-- SSOT: docs/products/LifeCoaching/LifeCoaching_HOME.md

CREATE TABLE IF NOT EXISTS adam_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_data JSONB NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_adam_profile_is_current
  ON adam_profile (is_current);