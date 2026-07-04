-- SYNOPSIS: Database migration — 20260704_create_achievements_table.sql.
-- KOS-P1-002: achievements table for child achievements

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_child_id
  ON achievements (child_id);

CREATE INDEX IF NOT EXISTS idx_achievements_timestamp
  ON achievements (timestamp);