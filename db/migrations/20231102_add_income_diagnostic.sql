-- SYNOPSIS: Database migration — 20231102_add_income_diagnostic.sql.
CREATE TABLE IF NOT EXISTS income_diagnostics (
    diagnostic_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    income_amount NUMERIC(10, 2) NOT NULL,
    income_source VARCHAR(255),
    diagnostic_date DATE NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);