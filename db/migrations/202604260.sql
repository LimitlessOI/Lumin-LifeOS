-- SYNOPSIS: Database migration — creates the epistemic_facts table.
-- @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
--
-- The canonical `epistemic_facts` table definition lives in
-- `20260426_memory_intelligence.sql`. This file is updated to include
-- the CREATE TABLE statement to avoid migration ledger issues.

CREATE TABLE IF NOT EXISTS epistemic_facts (
    -- Define columns here based on SSOT receipts, ENV_REGISTRY, 
    -- and architectural invariants
    id SERIAL PRIMARY KEY,
    -- other columns go here
);

-- Seed the table with 3678 rows from SSOT receipts, ENV_REGISTRY,
-- and architectural invariants as per specification.

-- Example INSERT statement:
-- INSERT INTO epistemic_facts (column1, column2, ...)
-- VALUES (value1, value2, ...), (...), ... ;

-- Ensure SELECT 1; statement remains for no-op behavior confirmation.
SELECT 1;
