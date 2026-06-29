-- SYNOPSIS: Database migration — 20260328_lifeos_truth_delivery.sql.
-- Migration: 20260328_lifeos_truth_delivery
-- Truth delivery calibration log — learns which style works per user
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

BEGIN;

CREATE TABLE IF NOT EXISTS truth_delivery_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  style_used      TEXT NOT NULL,  -- 'direct'|'gentle'|'coaching'
  topic           TEXT NOT NULL,  -- 'commitments'|'health'|'relationships'|'purpose'|'integrity'|'inner_work'
  truth_text      TEXT NOT NULL,
  acknowledged    BOOLEAN,        -- did the user engage with this truth?
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truth_delivery_user ON truth_delivery_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_truth_delivery_style ON truth_delivery_log (user_id, style_used, acknowledged);

COMMIT;
