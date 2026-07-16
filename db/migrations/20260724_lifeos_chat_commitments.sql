-- SYNOPSIS: Database migration — add chat commitment columns to the commitments table.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

-- The commitments table pre-exists from 20260328_lifeos_core.sql (id BIGSERIAL,
-- user_id BIGINT, title TEXT). This migration adds the columns the chat
-- commitment service (services/lifeos-commitment-service.js) expects.

ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_commitments_user_id ON commitments (user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_datetime ON commitments (datetime);
