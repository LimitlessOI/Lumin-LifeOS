-- SYNOPSIS: Database migration — 20260605_mission_runtime_commitments_missing_columns.sql.
-- Mission Runtime Phase 2 — missing commitments columns
-- The original `commitments` table (20260328_lifeos_repair.sql) did not include
-- the columns that mission-ledger.js queries for the household board.
-- These columns are prescribed by BPB-0001 §13.2 but were not in the patch migration.
-- Safe: all ADD COLUMN IF NOT EXISTS — idempotent.

ALTER TABLE commitments ADD COLUMN IF NOT EXISTS owner        TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS text         TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS due_date     DATE;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS reminder_at  TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS risk_if_missed TEXT;

CREATE INDEX IF NOT EXISTS idx_commitments_owner    ON commitments (owner)    WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_commitments_due_date ON commitments (due_date) WHERE status = 'open';
