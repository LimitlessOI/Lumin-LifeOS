-- SYNOPSIS: Database migration — 2023-10-01-security-receipt-spine.sql.
CREATE TABLE IF NOT EXISTS security_receipt_spine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_receipt_spine_created_at ON security_receipt_spine (created_at);
CREATE INDEX IF NOT EXISTS idx_security_receipt_spine_updated_at ON security_receipt_spine (updated_at);

-- This trigger will automatically update the `updated_at` column on each row modification.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_security_receipt_spine_updated_at') THEN
        CREATE TRIGGER set_security_receipt_spine_updated_at
        BEFORE UPDATE ON security_receipt_spine
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;