-- SYNOPSIS: Idempotent migration to add evaluator columns to the mentor_criteria table.
-- @ssot docs/products/lumin-university/PRODUCT_HOME.md

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'mentor_criteria'
    ) THEN
        ALTER TABLE mentor_criteria
            ADD COLUMN IF NOT EXISTS evaluator_certification VARCHAR(255),
            ADD COLUMN IF NOT EXISTS evaluator_experience_years INT,
            ADD COLUMN IF NOT EXISTS evaluator_approved BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
