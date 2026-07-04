-- SYNOPSIS: Database migration — 20260704_create_faith_tradition_lenses.sql.
CREATE TABLE IF NOT EXISTS faith_tradition_lenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  tradition_name TEXT NOT NULL,
  interpretation_notes_json JSONB NOT NULL,
  visual_rules_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faith_tradition_lenses_project_id ON faith_tradition_lenses (project_id);