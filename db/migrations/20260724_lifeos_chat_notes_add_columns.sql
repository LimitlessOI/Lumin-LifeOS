-- SYNOPSIS: Database migration — add tags/summary columns to lifeos_notes for chat capture.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

ALTER TABLE lifeos_notes
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary TEXT;
