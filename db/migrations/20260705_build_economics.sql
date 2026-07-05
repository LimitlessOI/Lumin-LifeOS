-- SYNOPSIS: Database migration — 20260705_build_economics.sql.
-- ============================================================
-- Build Economics Ledger
-- Records per-segment build cost + time so the system can predict
-- "how much will this cost and how long will it take" from history.
-- Captures phase timings (council review / agent / verify / total),
-- token usage + estimated USD, and code volume (files/lines).
-- @ssot docs/products/project-governance/PRODUCT_HOME.md
-- ============================================================

CREATE TABLE IF NOT EXISTS build_economics (
  id                 SERIAL PRIMARY KEY,
  segment_id         INTEGER REFERENCES project_segments(id) ON DELETE SET NULL,
  project_id         INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  project_slug       TEXT,
  stability_class    TEXT,
  agent              TEXT,
  model              TEXT,
  outcome            TEXT,              -- done | failed | needs_human | no_changes
  review_ms          INTEGER,
  agent_ms           INTEGER,
  verify_ms          INTEGER,
  total_ms           INTEGER,
  prompt_tokens      INTEGER DEFAULT 0,
  completion_tokens  INTEGER DEFAULT 0,
  total_tokens       INTEGER DEFAULT 0,
  estimated_usd      NUMERIC(12, 5) DEFAULT 0,
  files_changed      INTEGER DEFAULT 0,
  lines_added        INTEGER DEFAULT 0,
  lines_deleted      INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_economics_project ON build_economics(project_id);
CREATE INDEX IF NOT EXISTS idx_build_economics_class ON build_economics(stability_class);
CREATE INDEX IF NOT EXISTS idx_build_economics_outcome ON build_economics(outcome);
