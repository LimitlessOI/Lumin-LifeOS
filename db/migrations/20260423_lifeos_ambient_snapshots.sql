-- LifeOS ambient context snapshots (device / environment hints, no raw audio)
-- Opt-in client batches lightweight signals for Lumin context — no AI on insert.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

CREATE TABLE IF NOT EXISTS lifeos_ambient_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_ambient_user_created
  ON lifeos_ambient_snapshots (user_id, created_at DESC);
