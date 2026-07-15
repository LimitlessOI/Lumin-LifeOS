-- SYNOPSIS: Database migration — 20231102_add_income_diagnostic.sql.
CREATE TABLE IF NOT EXISTS income_diagnostics (
    diagnostic_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_amount NUMERIC(10, 2) NOT NULL,
    income_source VARCHAR(255),
    diagnostic_date DATE NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_income_diagnostics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_income_diagnostics_updated_at ON income_diagnostics;
CREATE TRIGGER trg_income_diagnostics_updated_at
BEFORE UPDATE ON income_diagnostics
FOR EACH ROW
EXECUTE FUNCTION update_income_diagnostics_updated_at();
