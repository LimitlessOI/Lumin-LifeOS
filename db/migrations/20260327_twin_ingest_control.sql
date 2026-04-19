-- ============================================================
-- Twin Auto-Ingest Control Table
-- @ssot docs/projects/AMENDMENT_09_LIFE_COACHING.md
--
-- Tracks the watermark for the twin auto-ingest pipeline.
-- One row per control key — currently only 'last_message_id'.
-- ============================================================

CREATE TABLE IF NOT EXISTS twin_ingest_control (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE twin_ingest_control IS
  'Watermark tracking for twin-auto-ingest.js — prevents re-processing messages already ingested into adam_decisions.';
