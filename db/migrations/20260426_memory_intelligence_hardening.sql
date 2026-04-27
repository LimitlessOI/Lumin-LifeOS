-- @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
-- Memory Intelligence hardening follow-up
-- Fixes source-count semantics, adds future-lookback artifact storage,
-- and adds indexes used by the service.

ALTER TABLE epistemic_facts
  ALTER COLUMN source_count SET DEFAULT 0;

-- Backfill rows that only carried the old default and have never received evidence.
UPDATE epistemic_facts
SET source_count = 0
WHERE trial_count = 0
  AND source_count = 1;

ALTER TABLE debate_records
  ADD COLUMN IF NOT EXISTS future_lookback JSONB;

CREATE INDEX IF NOT EXISTS idx_debate_records_problem_class
  ON debate_records(problem_class);

CREATE INDEX IF NOT EXISTS idx_fact_evidence_fact_source_independent
  ON fact_evidence(fact_id, source)
  WHERE source_is_independent;
