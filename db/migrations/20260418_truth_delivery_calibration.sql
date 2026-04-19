-- Migration: 20260418_truth_delivery_calibration
-- Extends truth_delivery_log with hour_of_day + emotional_state captured at delivery time,
-- so the calibration tick can learn the hour and emotional window where each user is most
-- likely to receive hard truths (not just which style).
-- Also adds a convenience view `truth_deliveries` because the scheduler previously
-- referenced that name and fell through as zero on every DB (drift fix).
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

ALTER TABLE truth_delivery_log
  ADD COLUMN IF NOT EXISTS hour_of_day       SMALLINT,
  ADD COLUMN IF NOT EXISTS emotional_state   TEXT,      -- 'calm'|'stirred'|'heated'|'flooded'|'unknown'
  ADD COLUMN IF NOT EXISTS joy_7d_at_time    NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS integrity_at_time INTEGER;

CREATE INDEX IF NOT EXISTS idx_truth_delivery_hour
  ON truth_delivery_log (user_id, hour_of_day, acknowledged);

CREATE INDEX IF NOT EXISTS idx_truth_delivery_state
  ON truth_delivery_log (user_id, emotional_state, acknowledged);

-- Drift fix: the scheduler historically queried `truth_deliveries` but the real
-- table has always been `truth_delivery_log`. Keep both names valid by exposing
-- a view so old queries continue to work even before code is redeployed.
CREATE OR REPLACE VIEW truth_deliveries AS
  SELECT * FROM truth_delivery_log;

COMMIT;
