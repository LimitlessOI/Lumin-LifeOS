-- SYNOPSIS: Creates the checkins table for LifeOS daily check-in entries.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

BEGIN;

CREATE TABLE IF NOT EXISTS checkins (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  entry_text    TEXT NOT NULL,
  minutes_ago   INTEGER DEFAULT 15,
  source        TEXT DEFAULT 'chat',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_created
  ON checkins (user_id, created_at DESC);

COMMIT;
