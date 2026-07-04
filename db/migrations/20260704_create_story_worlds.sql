-- SYNOPSIS: Database migration — 20260704_create_story_worlds.sql.
CREATE TABLE IF NOT EXISTS story_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  lore_json JSONB,
  rules_json JSONB,
  style_bible_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_story_worlds_project_id
  ON story_worlds (project_id);