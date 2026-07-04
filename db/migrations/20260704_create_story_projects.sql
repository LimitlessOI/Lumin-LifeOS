-- SYNOPSIS: Database migration — 20260704_create_story_projects.sql.
-- SS-P1-001: story_projects table for Story Studio
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS story_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  logline TEXT,
  rights_mode TEXT NOT NULL,
  privacy_mode TEXT NOT NULL,
  canon_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_projects_owner_id ON story_projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_story_projects_status ON story_projects (status);
CREATE INDEX IF NOT EXISTS idx_story_projects_created_at ON story_projects (created_at);