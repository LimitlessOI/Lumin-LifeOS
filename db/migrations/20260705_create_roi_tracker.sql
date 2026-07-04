-- SYNOPSIS: Database migration — 20260705_create_roi_tracker.sql.
CREATE TABLE IF NOT EXISTS roi_tracker (
  metric TEXT PRIMARY KEY,
  value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_roi_tracker_metric ON roi_tracker (metric);