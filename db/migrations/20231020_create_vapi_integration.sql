-- SYNOPSIS: Database migration — 20231020_create_vapi_integration.sql.
CREATE TABLE IF NOT EXISTS vapi_integrations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vapi_api_key TEXT NOT NULL,
    assistant_id TEXT,
    phone_number_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vapi_integrations_user_id ON vapi_integrations (user_id);

-- Add a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the vapi_integrations table
DROP TRIGGER IF EXISTS set_updated_at ON vapi_integrations;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON vapi_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add a column for Vapi phone number if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vapi_integrations' AND column_name = 'vapi_phone_number') THEN
        ALTER TABLE vapi_integrations ADD COLUMN vapi_phone_number TEXT;
    END IF;
END
$$;