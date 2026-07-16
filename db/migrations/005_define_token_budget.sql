-- SYNOPSIS: Database migration — add token-budget columns to the `context` table if it exists, using `IF NOT EXISTS` guards.
-- @ssot docs/products/knowledge-base/PRODUCT_HOME.md

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'context'
    ) THEN
        ALTER TABLE context
            ADD COLUMN IF NOT EXISTS token_budget_max_tokens INTEGER,
            ADD COLUMN IF NOT EXISTS token_budget_truncation_strategy VARCHAR(255);
    END IF;
END $$;
