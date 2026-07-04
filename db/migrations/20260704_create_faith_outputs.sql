-- SYNOPSIS: Database migration — 20260704_create_faith_outputs.sql.
CREATE TABLE IF NOT EXISTS faith_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  output_type TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  metadata_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faith_outputs_project_id ON faith_outputs (project_id);