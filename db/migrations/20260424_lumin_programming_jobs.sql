-- Lumin → project / builder bridge: persisted jobs for plan/draft/pending-adam flows.
-- Progress UI can poll by id; no AI on INSERT/UPDATE beyond application code.

CREATE TABLE IF NOT EXISTS lumin_programming_jobs (
  id              SERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users (id) ON DELETE CASCADE,
  thread_id       INTEGER NULL REFERENCES lumin_threads (id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'plan'
    CHECK (kind IN ('plan', 'draft', 'pending_queue')),
  status          TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'failed')),
  step_detail     TEXT,
  project_slug    TEXT,
  domain          TEXT,
  goal_text       TEXT,
  result_text     TEXT,
  result_meta     JSONB,
  error_text      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_programming_jobs_user_created
  ON lumin_programming_jobs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION trg_lumin_programming_jobs_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lumin_programming_jobs_touch ON lumin_programming_jobs;
CREATE TRIGGER lumin_programming_jobs_touch
  BEFORE UPDATE ON lumin_programming_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_lumin_programming_jobs_touch();
