-- SYNOPSIS: Database migration — 20260716_marketing_campaign_assets.sql.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS marketing_campaign_assets (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    asset_type TEXT NOT NULL,
    asset_content TEXT NOT NULL,
    status TEXT DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_assets_session_id ON marketing_campaign_assets(session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_assets_asset_type ON marketing_campaign_assets(asset_type);