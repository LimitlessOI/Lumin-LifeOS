-- SYNOPSIS: Database migration — 20260704_create_video_jobs.sql.
CREATE TABLE IF NOT EXISTS videoJobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  job_data JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_videoJobs_status ON videoJobs (status);
CREATE INDEX IF NOT EXISTS idx_videoJobs_created_at ON videoJobs (created_at);