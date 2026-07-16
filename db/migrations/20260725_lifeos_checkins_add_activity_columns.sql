-- SYNOPSIS: Adds minutes_ago and source columns to existing checkins table.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS minutes_ago INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chat';
