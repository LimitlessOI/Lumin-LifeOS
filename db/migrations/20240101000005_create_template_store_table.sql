-- SYNOPSIS: Database migration — 20240101000005_create_template_store_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS overlay_view_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product TEXT,
    intent_key TEXT,
    component_tree JSONB NOT NULL DEFAULT '{}'::jsonb,
    variant TEXT,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlay_view_templates_product ON overlay_view_templates (product);
CREATE INDEX IF NOT EXISTS idx_overlay_view_templates_intent_key ON overlay_view_templates (intent_key);
CREATE INDEX IF NOT EXISTS idx_overlay_view_templates_variant ON overlay_view_templates (variant);