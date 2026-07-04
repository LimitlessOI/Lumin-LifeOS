-- SYNOPSIS: Database migration — 20230704_create_estimation_log_table.sql.
-- Create estimation log table for Project Governance
-- Idempotent migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS estimation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimation_log_project_id
  ON estimation_log (project_id);

CREATE INDEX IF NOT EXISTS idx_estimation_log_created_at
  ON estimation_log (created_at);