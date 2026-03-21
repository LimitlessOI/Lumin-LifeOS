-- Migration: 20260317_builder_queue
-- Persists the auto-builder product queue to the DB so it survives server restarts.
-- On startup, auto-builder loads rows with status IN ('queued','in_progress') back into memory.

CREATE TABLE IF NOT EXISTS builder_queue (
  id           TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  definition   JSONB NOT NULL,          -- full product def: name, description, components[]
  status       TEXT DEFAULT 'queued',   -- queued | in_progress | complete | failed | stuck
  idea_id      UUID,                    -- optional link back to ideas table
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_builder_queue_status     ON builder_queue(status);
CREATE INDEX IF NOT EXISTS idx_builder_queue_created_at ON builder_queue(created_at DESC);
