-- SYNOPSIS: Database migration — 20230704_create_pending_adam_table.sql.
-- PG-P1-004: Create pending_adam table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pending_adam (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_adam_created_at
  ON pending_adam (created_at);