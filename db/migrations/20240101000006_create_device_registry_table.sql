-- SYNOPSIS: Database migration — 20240101000006_create_device_registry_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS overlay_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  device_key TEXT,
  platform TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlay_devices_device_key ON overlay_devices (device_key);
CREATE INDEX IF NOT EXISTS idx_overlay_devices_platform ON overlay_devices (platform);