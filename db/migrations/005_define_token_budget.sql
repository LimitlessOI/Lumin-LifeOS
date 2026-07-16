-- SYNOPSIS: Database migration — 005_define_token_budget.sql.
ALTER TABLE IF EXISTS context ADD COLUMN IF NOT EXISTS token_budget_max_tokens INTEGER;
ALTER TABLE IF EXISTS context ADD COLUMN IF NOT EXISTS token_budget_truncation_strategy VARCHAR(255);