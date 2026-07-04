-- SYNOPSIS: Database migration — 20230704_create_project_segments_table.sql.
-- Create project segments table for Project Governance
-- Idempotent migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS project_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_segments_project_id
  ON project_segments (project_id);

CREATE INDEX IF NOT EXISTS idx_project_segments_created_at
  ON project_segments (created_at);