-- SYNOPSIS: Database migration — 20260704_create_creator_performance_memory.sql.
-- CMOS-P1-006
-- Create table for storing channel performance metrics.

CREATE TABLE IF NOT EXISTS creator_performance_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  metric_type TEXT,
  metric_value NUMERIC(3,2),
  source TEXT,
  observed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_creator_performance_memory_channel_id
  ON creator_performance_memory (channel_id);

CREATE INDEX IF NOT EXISTS idx_creator_performance_memory_metric_type
  ON creator_performance_memory (metric_type);

CREATE INDEX IF NOT EXISTS idx_creator_performance_memory_observed_at
  ON creator_performance_memory (observed_at);