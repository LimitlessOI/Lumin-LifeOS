-- SYNOPSIS: Ensure user_trials columns/indexes exist, idempotently.
-- The table is created by 20260313_core_schema.sql; this migration only adds
-- columns/indexes that may be missing in older deployments.
ALTER TABLE user_trials
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE user_trials
    ADD COLUMN IF NOT EXISTS trial_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_trial_id ON user_trials(trial_id);
