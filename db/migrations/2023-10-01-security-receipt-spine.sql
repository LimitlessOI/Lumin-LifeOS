-- SYNOPSIS: Database migration — 2023-10-01-security-receipt-spine.sql.
CREATE TABLE IF NOT EXISTS security_receipt_spine (
    id SERIAL PRIMARY KEY,
    log_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_security_receipt_spine_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_security_receipt_spine ON security_receipt_spine;

CREATE TRIGGER set_updated_at_on_security_receipt_spine
BEFORE UPDATE ON security_receipt_spine
FOR EACH ROW
EXECUTE FUNCTION update_security_receipt_spine_updated_at();