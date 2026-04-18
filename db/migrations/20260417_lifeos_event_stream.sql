-- LifeOS unified capture/event stream
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

CREATE TABLE IF NOT EXISTS lifeos_event_stream (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  channel TEXT NOT NULL DEFAULT 'text',
  text_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'processed', 'applied', 'error')),
  detected_command TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_event_stream_user_created
  ON lifeos_event_stream (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifeos_event_stream_status
  ON lifeos_event_stream (status);

CREATE TABLE IF NOT EXISTS lifeos_event_actions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES lifeos_event_stream(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('commitment', 'calendar_event', 'command')),
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'applied', 'skipped', 'error')),
  applied_resource_type TEXT NULL,
  applied_resource_id TEXT NULL,
  applied_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_event_actions_event
  ON lifeos_event_actions (event_id, created_at ASC);

CREATE OR REPLACE FUNCTION lifeos_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lifeos_event_stream_touch ON lifeos_event_stream;
CREATE TRIGGER trg_lifeos_event_stream_touch
BEFORE UPDATE ON lifeos_event_stream
FOR EACH ROW EXECUTE FUNCTION lifeos_touch_updated_at();

DROP TRIGGER IF EXISTS trg_lifeos_event_actions_touch ON lifeos_event_actions;
CREATE TRIGGER trg_lifeos_event_actions_touch
BEFORE UPDATE ON lifeos_event_actions
FOR EACH ROW EXECUTE FUNCTION lifeos_touch_updated_at();
