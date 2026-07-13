-- SYNOPSIS: Database migration — add title to generated marketing content pieces.
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
ALTER TABLE marketing_content_pieces
  ADD COLUMN IF NOT EXISTS title TEXT;
