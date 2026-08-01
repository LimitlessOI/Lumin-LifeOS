-- SYNOPSIS: MarketingOS social publishing and scheduling tables.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md

-- Publishing post master table. The schedule table references this.
CREATE TABLE IF NOT EXISTS marketing_social_publishing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  platform TEXT NOT NULL,
  content_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_publishing_owner ON marketing_social_publishing(owner_id);

-- Schedule table for posts awaiting publication.
CREATE TABLE IF NOT EXISTS marketing_social_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES marketing_social_publishing(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  platform TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_schedules_post ON marketing_social_post_schedules(post_id);
CREATE INDEX IF NOT EXISTS idx_marketing_social_schedules_status ON marketing_social_post_schedules(status);
CREATE INDEX IF NOT EXISTS idx_marketing_social_schedules_time ON marketing_social_post_schedules(scheduled_at);
