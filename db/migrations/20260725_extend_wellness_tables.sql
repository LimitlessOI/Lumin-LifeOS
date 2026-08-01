-- SYNOPSIS: Extend LifeOS wellness tables with optional scoping fields.
-- Run idempotently with IF NOT EXISTS so re-runs are safe.

ALTER TABLE joy_checkins ADD COLUMN IF NOT EXISTS context_tag TEXT;
ALTER TABLE integrity_score_log ADD COLUMN IF NOT EXISTS source_note TEXT;
ALTER TABLE wearable_data ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE emotional_patterns ADD COLUMN IF NOT EXISTS pattern_strength NUMERIC(5,2);
