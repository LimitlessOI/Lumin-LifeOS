-- SYNOPSIS: Database migration — 002_define_token_budget.sql.
CREATE TABLE IF NOT EXISTS token_budget (
    id SERIAL PRIMARY KEY,
    context_name VARCHAR(255) NOT NULL,
    max_tokens INTEGER NOT NULL CHECK (max_tokens > 0),
    truncation_strategy VARCHAR(50) NOT NULL CHECK (truncation_strategy IN ('start', 'end', 'middle')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_token_budget_timestamp
BEFORE UPDATE ON token_budget
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();