-- SYNOPSIS: Database migration — 20230705_create_boldtrail_agents.sql.
-- BT-P1-002: BoldTrail agents table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS boldtrail_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_boldtrail_agents_name
  ON boldtrail_agents (name);