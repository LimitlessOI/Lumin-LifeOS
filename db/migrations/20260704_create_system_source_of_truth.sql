-- SYNOPSIS: Database migration — 20260704_create_system_source_of_truth.sql.
-- Create table for storing system source of truth documents
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS system_source_of_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_source_of_truth_document
  ON system_source_of_truth USING GIN (document);