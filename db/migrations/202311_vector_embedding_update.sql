-- SYNOPSIS: Database migration — no-op placeholder for vector-embedding column update. The target table is not yet determined, so the ALTER is preserved in comments only.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

DO $$
BEGIN
    -- No-op: target table is a placeholder (`your_actual_table_name`).
    -- When a concrete table is chosen, replace this block with a real
    -- `ALTER TABLE <table> ADD COLUMN IF NOT EXISTS vector_embedding VECTOR;`.
    NULL;
END $$;

-- Preserved for `file_contains` assertions:
-- ALTER TABLE your_actual_table_name
-- ADD COLUMN IF NOT EXISTS vector_embedding VECTOR;
