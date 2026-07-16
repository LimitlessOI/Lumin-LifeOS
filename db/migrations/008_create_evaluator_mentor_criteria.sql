-- SYNOPSIS: Database migration — create evaluator_mentor_criteria table (Postgres-safe).
-- @ssot docs/products/lumin-university/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS evaluator_mentor_criteria (
    id SERIAL PRIMARY KEY,
    mentor_id INT NOT NULL,
    criteria VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
