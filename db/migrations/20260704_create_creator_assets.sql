-- SYNOPSIS: Database migration — 20260704_create_creator_assets.sql.
-- CMOS-P1-005: Create table for storing various media assets.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS creator_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  asset_type TEXT,
  storage_url TEXT,
  metadata_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_creator_assets_channel_id
  ON creator_assets (channel_id);

CREATE INDEX IF NOT EXISTS idx_creator_assets_asset_type
  ON creator_assets (asset_type);