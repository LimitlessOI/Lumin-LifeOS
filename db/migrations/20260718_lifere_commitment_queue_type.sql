-- SYNOPSIS: Add type column to lifere_commitment_queue for commitment categorization.
-- @ssot docs/products/lifere/PRODUCT_HOME.md

ALTER TABLE lifere_commitment_queue
ADD COLUMN IF NOT EXISTS type text;
