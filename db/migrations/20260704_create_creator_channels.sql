-- SYNOPSIS: Database migration — 20260704_create_creator_channels.sql.
-- Create table for storing creator channels
CREATE TABLE IF NOT EXISTS creator_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  brand_profile_json JSONB,
  seo_profile_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_creator_channels_owner_id
  ON creator_channels (owner_id);