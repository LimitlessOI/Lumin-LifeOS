-- SYNOPSIS: Database migration — 20260715_marketing_performance_analytics.sql.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS marketing_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    platform TEXT NOT NULL,
    engagement_type TEXT NOT NULL,
    engagement_value NUMERIC,
    learning_tags JSONB,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_performance_analytics_post_id ON marketing_performance_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_marketing_performance_analytics_platform ON marketing_performance_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_performance_analytics_engagement_type ON marketing_performance_analytics(engagement_type);
CREATE INDEX IF NOT EXISTS idx_marketing_performance_analytics_timestamp ON marketing_performance_analytics(timestamp);