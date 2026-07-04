-- SYNOPSIS: Database migration — 20260704_create_lifere_sales_coaching.sql.
-- Migration: lifere_sales_coaching
-- Blueprint: LRE-P1-001

CREATE TABLE IF NOT EXISTS lifere_sales_coaching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario TEXT NOT NULL,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coached_turns JSONB NOT NULL DEFAULT '{}',
  end_session_debrief TEXT,
  score_readback TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifere_sales_coaching_session_start
  ON lifere_sales_coaching (session_start);