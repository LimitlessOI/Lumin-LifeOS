-- Migration: 20260317_idea_queue
-- Adds approval gate columns to the ideas table.
-- Ideas now require explicit human approval before the auto-builder will touch them.
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING guards).

-- Ensure the ideas table exists (created by Drizzle push or prior migration)
CREATE TABLE IF NOT EXISTS ideas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  source           TEXT,
  status           TEXT DEFAULT 'queued',
  alignment_score  REAL,
  revenue_potential INTEGER,
  effort_estimate  INTEGER,
  risk_level       TEXT,
  priority_score   REAL,
  pipeline_id      TEXT,
  outcome_id       TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  implemented_at   TIMESTAMP,
  metadata         JSONB
);

-- Approval gate columns
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS approval_status   TEXT DEFAULT 'pending_review';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMP;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMP;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS build_priority    INTEGER DEFAULT 50;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS build_triggered_at TIMESTAMP;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS build_pod_id      TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS notes             TEXT;

-- Index for fast queue reads
CREATE INDEX IF NOT EXISTS idx_ideas_approval_status ON ideas(approval_status);
CREATE INDEX IF NOT EXISTS idx_ideas_build_priority  ON ideas(build_priority DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at      ON ideas(created_at DESC);

-- approval_status values:
--   pending_review  — waiting for Adam to review
--   approved        — Adam approved, ready to build
--   rejected        — Adam rejected (with reason)
--   building        — currently being built by auto-builder
--   built           — auto-builder finished, files on disk
--   deployed        — committed to GitHub + Railway deployed
