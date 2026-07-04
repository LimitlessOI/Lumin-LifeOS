-- SYNOPSIS: Database migration — 20260704_create_faith_sources.sql.
CREATE TABLE IF NOT EXISTS faith_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  source_ref TEXT NOT NULL,
  source_text TEXT NOT NULL,
  canon_type TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faith_sources_project_id ON faith_sources (project_id);