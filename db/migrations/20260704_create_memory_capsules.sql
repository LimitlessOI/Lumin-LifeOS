-- SYNOPSIS: Database migration — 20260704_create_memory_capsules.sql.
-- MS-P1-001: memory_capsules table for memory-system

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS memory_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL,
  trust_level INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_memory_capsules_owner_id
  ON memory_capsules (owner_id);

CREATE INDEX IF NOT EXISTS idx_memory_capsules_created_at
  ON memory_capsules (created_at);