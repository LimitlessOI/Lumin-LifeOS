-- SYNOPSIS: Database migration — 20260704_create_story_rights.sql.
-- SS-P1-007: Create story_rights table for Story Studio project rights and permissions

CREATE TABLE IF NOT EXISTS story_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  underlying_owner TEXT NOT NULL,
  derivative_rights_json JSONB,
  royalty_split_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_story_rights_project_id
  ON story_rights (project_id);