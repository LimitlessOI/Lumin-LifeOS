-- SYNOPSIS: Idempotent migration to add evaluator columns to the mentor_criteria table.
-- @ssot docs/products/lumin-university/PRODUCT_HOME.md
-- Table is created in 002_create_mentor_criteria.sql.

ALTER TABLE IF EXISTS mentor_criteria
    ADD COLUMN IF NOT EXISTS evaluator_certification VARCHAR(255),
    ADD COLUMN IF NOT EXISTS evaluator_experience_years INT,
    ADD COLUMN IF NOT EXISTS evaluator_approved BOOLEAN DEFAULT FALSE;
