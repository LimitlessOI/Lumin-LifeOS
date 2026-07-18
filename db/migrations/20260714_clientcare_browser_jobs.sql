-- SYNOPSIS: Persist ClientCare billing browser jobs across Railway instances (birth-activity / claim-prep).
CREATE TABLE IF NOT EXISTS clientcare_browser_jobs (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS clientcare_browser_jobs_status_idx ON clientcare_browser_jobs (status);
CREATE INDEX IF NOT EXISTS clientcare_browser_jobs_kind_created_idx ON clientcare_browser_jobs (kind, created_at DESC);
