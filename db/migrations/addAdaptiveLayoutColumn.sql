-- SYNOPSIS: Add adaptive layout preferences column to flourishing_prefs table.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS flourishing_prefs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  adaptive_layout_preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE flourishing_prefs
ADD COLUMN IF NOT EXISTS adaptive_layout_preferences JSONB;
