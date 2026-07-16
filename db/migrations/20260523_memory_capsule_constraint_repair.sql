-- SYNOPSIS: Database migration — 20260523_memory_capsule_constraint_repair.sql.
-- db/migrations/20260523_memory_capsule_constraint_repair.sql
-- Repair: initial 20260521 migration ran before user_input was added to source_type.
-- CREATE TABLE IF NOT EXISTS was a no-op on re-deploy, so constraint was never updated.
-- This migration applies the idempotency-safe fixes that the modified CREATE TABLE could not.

-- 1. Fix memory_capsules.source_type CHECK constraint to include user_input
ALTER TABLE memory_capsules
  ADD CONSTRAINT memory_capsules_user_input_check
    CHECK (user_input IS NOT NULL AND user_input <> '');
ALTER TABLE memory_capsules
  DROP CONSTRAINT IF EXISTS memory_capsules_source_type_check;

ALTER TABLE memory_capsules
  ADD CONSTRAINT memory_capsules_source_type_check
    CHECK (source_type IN (
      'founder_input',
      'user_input',
      'system_observation',
      'legacy_import',
      'council_output',
      'external_signal',
      'working_memory_entry',
      'institutional_record'
    ));

-- 2. Add missing columns to working_memory_entries (no-op if already present)
ALTER TABLE working_memory_entries
  ADD COLUMN IF NOT EXISTS entry_content TEXT;

ALTER TABLE working_memory_entries
  ADD COLUMN IF NOT EXISTS promoted_to_candidate BOOLEAN DEFAULT FALSE;

-- 3. Ensure epistemic_facts.decay_rate exists (original migration used INTEGER; that is fine)
--    Adding review_by if the column was missed by any migration run order issue.
ALTER TABLE epistemic_facts
  ADD COLUMN IF NOT EXISTS review_by TIMESTAMPTZ;
