-- SYNOPSIS: Database migration — 20231028_create_vapi_account.sql.
CREATE TABLE IF NOT EXISTS vapi_accounts (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vapi_accounts_updated_at ON vapi_accounts;
CREATE TRIGGER set_vapi_accounts_updated_at
BEFORE UPDATE ON vapi_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();