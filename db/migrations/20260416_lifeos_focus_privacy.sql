-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
-- LifeOS focus sessions, privacy windows, redaction jobs, and command log

CREATE TABLE IF NOT EXISTS lifeos_focus_sessions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  intention        TEXT NOT NULL,
  planned_minutes  INTEGER NOT NULL DEFAULT 60,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'interrupted')),
  source           TEXT NOT NULL DEFAULT 'manual',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_focus_sessions_user_started
  ON lifeos_focus_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifeos_focus_sessions_active
  ON lifeos_focus_sessions (user_id, status)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lifeos_focus_interventions (
  id                BIGSERIAL PRIMARY KEY,
  session_id        BIGINT NOT NULL REFERENCES lifeos_focus_sessions(id) ON DELETE CASCADE,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('nudge', 'reflection', 'redirect', 'pause', 'resume')),
  message           TEXT,
  effectiveness     SMALLINT CHECK (effectiveness BETWEEN 1 AND 5),
  recovered_focus   BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_focus_interventions_session
  ON lifeos_focus_interventions (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifeos_focus_interventions_user
  ON lifeos_focus_interventions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lifeos_privacy_windows (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  mode              TEXT NOT NULL DEFAULT 'pause_capture' CHECK (mode IN ('pause_capture', 'redact_window')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'redacted', 'cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at           TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_minutes  INTEGER,
  reason            TEXT,
  source            TEXT NOT NULL DEFAULT 'manual',
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_privacy_windows_user_started
  ON lifeos_privacy_windows (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifeos_privacy_windows_active
  ON lifeos_privacy_windows (user_id, status)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lifeos_redaction_jobs (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  privacy_window_id  BIGINT REFERENCES lifeos_privacy_windows(id) ON DELETE SET NULL,
  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'applied', 'cancelled', 'failed')),
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_redaction_jobs_user
  ON lifeos_redaction_jobs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lifeos_command_log (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  command_text     TEXT NOT NULL,
  parsed_action    TEXT,
  parsed_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  executed         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_command_log_user_created
  ON lifeos_command_log (user_id, created_at DESC);
