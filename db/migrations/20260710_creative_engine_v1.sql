-- SYNOPSIS: Creative Engine v1 schema — jobs + assets for footage/photo/script/broll modes
-- @ssot docs/products/creative-engine/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS creative_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('footage_edit', 'photo_polish', 'script_compose', 'generative_broll', 'template_assemble')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  cost_estimate_cents INTEGER,
  cost_actual_cents INTEGER,
  consent_record_id UUID,
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS creative_jobs_owner_id_idx ON creative_jobs (owner_id);
CREATE INDEX IF NOT EXISTS creative_jobs_status_idx ON creative_jobs (status);
CREATE INDEX IF NOT EXISTS creative_jobs_owner_created_idx ON creative_jobs (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS creative_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id TEXT NOT NULL,
  job_id UUID REFERENCES creative_jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('upload', 'clip', 'output', 'caption', 'photo', 'audio')),
  storage_key TEXT NOT NULL,
  public_url TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_assets_owner_id_idx ON creative_assets (owner_id);
CREATE INDEX IF NOT EXISTS creative_assets_job_id_idx ON creative_assets (job_id);
