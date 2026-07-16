-- SYNOPSIS: Database migration — create checkins table for daily stand-up capture.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS checkins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  activity_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins (created_at);
