-- SYNOPSIS: Database migration — 011_define_token_budget.sql.
-- Migration to define token budget with max_tokens cap and truncation strategy

CREATE TABLE IF NOT EXISTS token_budget (
    id SERIAL PRIMARY KEY,
    max_tokens INTEGER NOT NULL,
    truncation_strategy VARCHAR(50) NOT NULL
);

-- Optionally, insert default values if necessary
-- INSERT INTO token_budget (max_tokens, truncation_strategy) VALUES (1000, 'truncate_end');
