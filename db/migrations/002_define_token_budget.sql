-- SYNOPSIS: Database migration — 002_define_token_budget.sql.
CREATE TABLE IF NOT EXISTS token_budgets (
    id SERIAL PRIMARY KEY,
    context_type VARCHAR(255) UNIQUE NOT NULL,
    max_tokens INTEGER NOT NULL CHECK (max_tokens > 0),
    truncation_strategy VARCHAR(50) NOT NULL
);

INSERT INTO token_budgets (context_type, max_tokens, truncation_strategy)
VALUES ('default_injection', 4096, 'head_tail')
ON CONFLICT (context_type) DO NOTHING;

INSERT INTO token_budgets (context_type, max_tokens, truncation_strategy)
VALUES ('code_generation', 8192, 'tail')
ON CONFLICT (context_type) DO NOTHING;

INSERT INTO token_budgets (context_type, max_tokens, truncation_strategy)
VALUES ('summarization', 2048, 'head')
ON CONFLICT (context_type) DO NOTHING;