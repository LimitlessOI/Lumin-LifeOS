-- SYNOPSIS: Database migration — 20260813_overlay_devices_capabilities.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
ALTER TABLE overlay_devices ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '{}'::jsonb;