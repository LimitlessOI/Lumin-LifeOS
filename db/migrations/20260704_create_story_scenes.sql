-- SYNOPSIS: Database migration — 20260704_create_story_scenes.sql.
-- Create story_scenes table for Story Studio
CREATE TABLE IF NOT EXISTS story_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  sequence_no INT NOT NULL,
  beat_type TEXT,
  summary TEXT,
  dialogue_json JSONB,
  soundtrack_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_scenes_project_id
  ON story_scenes (project_id);

CREATE INDEX IF NOT EXISTS idx_story_scenes_project_id_sequence_no
  ON story_scenes (project_id, sequence_no);