-- SYNOPSIS: Creative Engine schema expansion — competitor analysis + social video publish queue
-- @ssot docs/products/creative-engine/PRODUCT_HOME.md

BEGIN;

-- Allow new analysis/publish modes and durable report/video asset kinds
ALTER TABLE creative_jobs DROP CONSTRAINT IF EXISTS creative_jobs_mode_check;
ALTER TABLE creative_jobs ADD CONSTRAINT creative_jobs_mode_check
  CHECK (mode IN ('footage_edit','photo_polish','script_compose','generative_broll','template_assemble','competitor_analysis','social_publish'));

ALTER TABLE creative_assets DROP CONSTRAINT IF EXISTS creative_assets_kind_check;
ALTER TABLE creative_assets ADD CONSTRAINT creative_assets_kind_check
  CHECK (kind IN ('upload','clip','output','caption','photo','audio','report','video'));

-- Queue for one-click social publishing of creative outputs
CREATE TABLE IF NOT EXISTS creative_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  creative_job_id UUID REFERENCES creative_jobs(id) ON DELETE SET NULL,
  output_key TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','linkedin','x','facebook','youtube','tiktok')),
  caption TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','connected','publishing','published','needs_human','failed')),
  platform_post_id TEXT,
  error_detail TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_publish_queue_owner ON creative_publish_queue(owner_id);
CREATE INDEX IF NOT EXISTS idx_creative_publish_queue_status ON creative_publish_queue(status);

-- Dedicated table for competitor niche analysis reports
CREATE TABLE IF NOT EXISTS creative_competitor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  creative_job_id UUID REFERENCES creative_jobs(id) ON DELETE SET NULL,
  niche TEXT NOT NULL,
  query_used TEXT,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_competitor_reports_owner ON creative_competitor_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_creative_competitor_reports_niche ON creative_competitor_reports(niche);

COMMIT;
