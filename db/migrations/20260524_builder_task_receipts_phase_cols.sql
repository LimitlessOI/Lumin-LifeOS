-- SYNOPSIS: Database migration — 20260524_builder_task_receipts_phase_cols.sql.
-- Phase proof columns for builder_task_receipts
-- Adds: prompt_hash, prompt_version, failure_family, builder_lane
-- These columns were added locally via ad-hoc ALTER TABLE but were never committed
-- in a migration file. Railway's DB is missing them. This migration closes the gap.
-- @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md

ALTER TABLE builder_task_receipts
  ADD COLUMN IF NOT EXISTS prompt_hash     TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version  TEXT,
  ADD COLUMN IF NOT EXISTS failure_family  TEXT,
  ADD COLUMN IF NOT EXISTS builder_lane    TEXT
    CHECK (builder_lane IN ('conductor', 'autonomous', 'legacy', 'unknown'));

-- Extend failure_family constraint on builder_failure_log to include values
-- that were added locally but are missing from the original migration
ALTER TABLE builder_failure_log
  DROP CONSTRAINT IF EXISTS builder_failure_log_failure_family_check;

ALTER TABLE builder_failure_log
  ADD CONSTRAINT builder_failure_log_failure_family_check
  CHECK (failure_family IN (
    'scope_violation', 'budget_exceeded', 'context_overflow',
    'audit_fail', 'lock_conflict', 'queue_exhausted',
    'partial_state', 'founder_halt', 'council_stop',
    'verification_failed', 'runtime_error', 'partial_completion',
    'stale_truth', 'write_authority_violation', 'serial_lock_conflict',
    'unknown'
  ));

CREATE INDEX IF NOT EXISTS idx_task_receipts_prompt_hash ON builder_task_receipts(prompt_hash) WHERE prompt_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_receipts_builder_lane ON builder_task_receipts(builder_lane) WHERE builder_lane IS NOT NULL;
