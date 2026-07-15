-- SYNOPSIS: Database migration — 20231002_create_income_diagnostic.sql.
CREATE TABLE IF NOT EXISTS income_diagnostic (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    income_source VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date_received DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_diagnostic_user_id ON income_diagnostic(user_id);
CREATE INDEX IF NOT EXISTS idx_income_diagnostic_date_received ON income_diagnostic(date_received);