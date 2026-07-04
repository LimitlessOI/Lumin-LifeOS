-- SYNOPSIS: Database migration — 20260704_create_creator_likeness_profiles.sql.
CREATE TABLE IF NOT EXISTS creator_likeness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  face_profile_json JSONB,
  voice_profile_json JSONB,
  consent_mode TEXT NOT NULL,
  revocable_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_creator_likeness_profiles_channel_id
  ON creator_likeness_profiles (channel_id);

CREATE INDEX IF NOT EXISTS idx_creator_likeness_profiles_consent_mode
  ON creator_likeness_profiles (consent_mode);