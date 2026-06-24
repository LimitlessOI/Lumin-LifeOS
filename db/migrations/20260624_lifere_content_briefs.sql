-- SYNOPSIS: Database migration — lifere_content_briefs for SMOS brief-first workflow.
CREATE TABLE IF NOT EXISTS lifere_content_briefs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  persona JSONB NOT NULL DEFAULT '{}',
  competitor_intel JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  seo_pack JSONB NOT NULL DEFAULT '{}',
  content_gaps JSONB NOT NULL DEFAULT '[]',
  target_platforms TEXT[] NOT NULL DEFAULT '{youtube,facebook}',
  brief_body JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifere_content_briefs_user_status
  ON lifere_content_briefs (tenant_id, user_id, status);
