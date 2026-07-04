-- SYNOPSIS: Database migration — 20260705_create_user_trials.sql.
-- business_tools_product_home.sql
-- BT-P1-001: Create user_trials table to track trial periods for users.

CREATE TABLE IF NOT EXISTS user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_trials_user_id
  ON user_trials (user_id);

CREATE INDEX IF NOT EXISTS idx_user_trials_status
  ON user_trials (status);