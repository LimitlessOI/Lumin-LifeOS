-- SYNOPSIS: Database migration — 20260624_lumin_learning_layer.sql.
CREATE TABLE IF NOT EXISTS lumin_moment_clips (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  clip_type       VARCHAR(32) NOT NULL DEFAULT 'lesson',
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  source          VARCHAR(32) NOT NULL DEFAULT 'conversation',
  source_ref      TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_moment_clips_user
  ON lumin_moment_clips(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lumin_contact_update_queue (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  contact_name    TEXT NOT NULL,
  field_name      TEXT NOT NULL,
  field_value     TEXT NOT NULL,
  context_note    TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  source_ref      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lumin_contact_queue_user
  ON lumin_contact_update_queue(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS lumin_preference_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  signal_type     VARCHAR(32) NOT NULL,
  signal_text     TEXT NOT NULL,
  source_ref      TEXT,
  applied         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_preference_log_user
  ON lumin_preference_log(user_id, created_at DESC);
