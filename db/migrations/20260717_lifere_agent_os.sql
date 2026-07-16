-- SYNOPSIS: Database migration — 20260717_lifere_agent_os.sql.
-- Create lifere_agent_profiles table
CREATE TABLE IF NOT EXISTS lifere_agent_profiles (
    user_id bigint PRIMARY KEY,
    license_state text,
    experience_level text,
    goals jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create lifere_training_modules table
CREATE TABLE IF NOT EXISTS lifere_training_modules (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text,
    category text,
    content jsonb,
    order_index int,
    created_at timestamptz DEFAULT now()
);

-- Create lifere_roleplay_sessions table
CREATE TABLE IF NOT EXISTS lifere_roleplay_sessions (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    agent_id bigint,
    scenario text,
    transcript jsonb,
    score jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create lifere_appointment_captures table
CREATE TABLE IF NOT EXISTS lifere_appointment_captures (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    agent_id bigint,
    transcript text,
    extracted_commitments jsonb,
    extracted_criteria jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create lifere_commitment_queue table
CREATE TABLE IF NOT EXISTS lifere_commitment_queue (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    agent_id bigint,
    promise_text text,
    due_at timestamptz,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Create lifere_mls_search_queue table
CREATE TABLE IF NOT EXISTS lifere_mls_search_queue (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    agent_id bigint,
    criteria jsonb,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Example trigger function for updating 'updated_at' column
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tables that require 'updated_at'
-- Assuming 'updated_at' is needed, add the column and trigger for each applicable table
-- e.g., for lifere_agent_profiles
ALTER TABLE lifere_agent_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;
CREATE TRIGGER update_lifere_agent_profiles_updated_at
BEFORE UPDATE ON lifere_agent_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Repeat the ALTER TABLE and CREATE TRIGGER for each applicable table
