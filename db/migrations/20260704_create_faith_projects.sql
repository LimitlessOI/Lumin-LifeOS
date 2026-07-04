-- SYNOPSIS: Database migration — 20260704_create_faith_projects.sql.
CREATE TABLE IF NOT EXISTS faith_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_mode TEXT NOT NULL,
  tradition_profile TEXT NOT NULL,
  privacy_mode TEXT NOT NULL,
  reverence_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faith_projects_owner_id ON faith_projects (owner_id);