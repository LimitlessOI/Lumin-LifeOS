-- SYNOPSIS: Database migration — 20260704_create_story_assets.sql.
-- SS-P1-005: story_assets table
CREATE TABLE IF NOT EXISTS story_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  format TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  metadata_json JSONB,
  version_no INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_story_assets_project_id ON story_assets (project_id);
CREATE INDEX IF NOT EXISTS idx_story_assets_asset_type ON story_assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_story_assets_version_no ON story_assets (version_no);