-- SYNOPSIS: Database migration — 20260704_create_story_characters.sql.
CREATE TABLE IF NOT EXISTS story_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  appearance_profile JSONB,
  voice_profile JSONB,
  personality_profile JSONB
);

CREATE INDEX IF NOT EXISTS idx_story_characters_project_id
  ON story_characters(project_id);