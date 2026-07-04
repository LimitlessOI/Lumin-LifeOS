-- SYNOPSIS: Database migration — 20260704_create_knowledge_base_files.sql.
-- Knowledge Base files table migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS knowledge_base_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_data BYTEA NOT NULL,
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_category
  ON knowledge_base_files (category);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_tags
  ON knowledge_base_files USING GIN (tags);