-- SYNOPSIS: Idempotent migration to add evaluator columns to the mentor_criteria table.
-- @ssot docs/products/lumin-university/PRODUCT_HOME.md

DO $$
BEGIN
    -- Create table if it does not exist
    CREATE TABLE IF NOT EXISTS mentor_criteria (
        id SERIAL PRIMARY KEY -- Assuming an id column for uniqueness
    );

    -- Add new columns if they do not exist
    ALTER TABLE mentor_criteria
        ADD COLUMN IF NOT EXISTS evaluator_certification VARCHAR(255),
        ADD COLUMN IF NOT EXISTS evaluator_experience_years INT,
        ADD COLUMN IF NOT EXISTS evaluator_approved BOOLEAN DEFAULT FALSE;
END $$;
