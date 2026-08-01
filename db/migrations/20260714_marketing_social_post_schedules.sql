-- SYNOPSIS: Database migration — 20260714_marketing_social_post_schedules.sql.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
-- post_id references marketing_publish_records, not a table literally named
-- marketing_social_publishing (that string is only this migration's own
-- filename topic — the actual tables it creates are marketing_social_connections,
-- marketing_social_posting_templates, and marketing_publish_records; see
-- db/migrations/20260710_marketing_social_publishing.sql). The original FK
-- target here never existed and would have failed at execution.
CREATE TABLE IF NOT EXISTS marketing_social_post_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES marketing_publish_records(id) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_post_id ON marketing_social_post_schedules(post_id);
CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_scheduled_at ON marketing_social_post_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_social_post_schedules_status ON marketing_social_post_schedules(status);