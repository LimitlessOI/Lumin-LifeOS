-- SYNOPSIS: Database migration — 010_define_token_budget.sql.
-- db/migrations/010_define_token_budget.sql

CREATE TABLE IF NOT EXISTS token_budget (
    budget_id SERIAL PRIMARY KEY,
    max_tokens INTEGER NOT NULL
);
