-- SYNOPSIS: Database migration — 008_define_token_budget.sql.
-- db/migrations/008_define_token_budget.sql

-- Ensure the table exists
CREATE TABLE IF NOT EXISTS token_budget (
    id SERIAL PRIMARY KEY,
    max_tokens INTEGER NOT NULL,
    truncation_strategy VARCHAR(50) NOT NULL
);

-- Insert default values for token budget
INSERT INTO token_budget (max_tokens, truncation_strategy)
VALUES (1000, 'truncate_end');

-- Add any additional logic or constraints as needed
