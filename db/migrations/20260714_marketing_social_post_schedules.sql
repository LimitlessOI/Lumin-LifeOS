-- SYNOPSIS: Database migration — 20260714_marketing_social_post_schedules.sql.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS marketing_social_post_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES marketing_social_publishing(id) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_post_id ON marketing_social_post_schedules(post_id);
CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_scheduled_at ON marketing_social_post_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_status ON marketing_social_post_schedules(status);