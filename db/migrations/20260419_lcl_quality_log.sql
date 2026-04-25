-- Migration: 20260419_lcl_quality_log.sql
-- Purpose: Persistent drift log for the LCL (LifeOS Compression Language) monitor.
--
-- Records every drift event (symbol leakage, empty response) detected by
-- services/lcl-monitor.js. Used for:
--   1. Trend analysis — is drift getting worse over time for a (member, taskType)?
--   2. Rollback evidence — show exactly which symbols leaked and when
--   3. Dashboard — GET /api/v1/lifeos/builder/lcl-stats
--
-- In-memory state in lcl-monitor.js is the source of truth for routing decisions.
-- This table is the historical record that survives Railway restarts.

CREATE TABLE IF NOT EXISTS lcl_quality_log (
  id                   BIGSERIAL PRIMARY KEY,
  member               TEXT NOT NULL,                    -- council member key e.g. 'groq_llama'
  task_type            TEXT NOT NULL,                    -- task type e.g. 'codegen'
  drift_detected       BOOLEAN NOT NULL DEFAULT false,   -- always true for rows in this table
  leaked_symbols       JSONB,                            -- e.g. ["*pq", "*uid"]
  is_empty_response    BOOLEAN NOT NULL DEFAULT false,   -- response was blank/too short
  drift_rate           NUMERIC(6, 5),                    -- e.g. 0.08 = 8% at time of event
  total_calls_at_event INTEGER,                          -- how many calls had been made
  lcl_disabled         BOOLEAN NOT NULL DEFAULT false,   -- did this event trigger auto-disable?
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Query: "which (member, taskType) pairs have the most drift?"
CREATE INDEX IF NOT EXISTS idx_lcl_quality_log_pair
  ON lcl_quality_log (member, task_type, created_at DESC);

-- Query: "how many disable events in the last 7 days?"
CREATE INDEX IF NOT EXISTS idx_lcl_quality_log_disabled
  ON lcl_quality_log (lcl_disabled, created_at DESC)
  WHERE lcl_disabled = true;
