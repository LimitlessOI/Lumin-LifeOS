-- SYNOPSIS: Database migration — 20260704_create_faith_scenes.sql.
CREATE TABLE IF NOT EXISTS faith_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  sequence_no INT NOT NULL,
  scene_summary TEXT NOT NULL,
  witness_mode_enabled BOOLEAN NOT NULL,
  explanation_level TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faith_scenes_project_id ON faith_scenes (project_id);
CREATE INDEX IF NOT EXISTS idx_faith_scenes_project_id_sequence_no ON faith_scenes (project_id, sequence_no);