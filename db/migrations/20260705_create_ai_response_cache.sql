-- SYNOPSIS: Database migration — 20260705_create_ai_response_cache.sql.
-- Create cache table for AI response caching
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_data JSONB NOT NULL DEFAULT '{}',
  hit_count INT NOT NULL DEFAULT 0
);

-- Index to support cache lookups by hit count if needed by consumers
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hit_count
  ON ai_response_cache (hit_count);