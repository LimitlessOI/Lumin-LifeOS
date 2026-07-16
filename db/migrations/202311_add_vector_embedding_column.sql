-- SYNOPSIS: Database migration — add vector_embedding column to items if not present.
-- @ssot docs/products/ai-council/PRODUCT_HOME.md

BEGIN;

-- Example for a table named 'items', adjust table names as needed
ALTER TABLE IF EXISTS items
ADD COLUMN IF NOT EXISTS vector_embedding VECTOR; -- Replace VECTOR with the appropriate data type for your use case

-- Repeat the above ALTER TABLE statement for each applicable table
-- ALTER TABLE another_table
-- ADD COLUMN vector_embedding VECTOR;

COMMIT;
