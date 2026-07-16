-- SYNOPSIS: Database migration — 005_define_token_budget.sql.
ALTER TABLE context ADD COLUMN token_budget_max_tokens INTEGER;
ALTER TABLE context ADD COLUMN token_budget_truncation_strategy VARCHAR(255);
