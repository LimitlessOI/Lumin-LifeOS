-- SYNOPSIS: Database migration — 20230704_create_projects_table.sql.
-- Create projects table for Project Governance
-- Idempotent migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at
  ON projects (created_at);