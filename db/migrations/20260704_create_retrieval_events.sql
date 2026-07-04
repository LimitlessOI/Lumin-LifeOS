-- SYNOPSIS: Database migration — 20260704_create_retrieval_events.sql.
-- Migration: MI-P1-004
-- Purpose: Create retrieval_events table to log retrieval of facts.

CREATE TABLE IF NOT EXISTS retrieval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL,
  retrieved_by UUID NOT NULL,
  context TEXT,
  acted_on BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_events_fact_id
  ON retrieval_events (fact_id);

CREATE INDEX IF NOT EXISTS idx_retrieval_events_retrieved_by
  ON retrieval_events (retrieved_by);

CREATE INDEX IF NOT EXISTS idx_retrieval_events_created_at
  ON retrieval_events (created_at);