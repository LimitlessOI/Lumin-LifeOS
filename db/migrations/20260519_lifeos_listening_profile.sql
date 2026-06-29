-- SYNOPSIS: Database migration — 20260519_lifeos_listening_profile.sql.
-- LifeOS Listening Profile — opt-in ambient / capture / family guard preferences
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS lifeos_listening_profiles (
  user_id           BIGINT PRIMARY KEY REFERENCES lifeos_users(id) ON DELETE CASCADE,
  master_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_done   BOOLEAN NOT NULL DEFAULT FALSE,
  profile_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_step   TEXT,
  last_applied_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_listening_profiles_enabled
  ON lifeos_listening_profiles (master_enabled)
  WHERE master_enabled = TRUE;

COMMENT ON TABLE lifeos_listening_profiles IS
  'Per-user listening/capture preferences — conversational onboarding via Lumen; device audio stays local unless explicit opt-in in profile_json.capture';
