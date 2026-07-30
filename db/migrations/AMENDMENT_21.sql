-- SYNOPSIS: Database migration — AMENDMENT_21.sql.
CREATE TABLE IF NOT EXISTS layer_12_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add an index for faster lookups on 'name'
CREATE INDEX IF NOT EXISTS idx_layer_12_data_name ON layer_12_data (name);

-- Function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_layer_12_data_updated_at') THEN
        CREATE TRIGGER trg_layer_12_data_updated_at
        BEFORE UPDATE ON layer_12_data
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Additional table for configuration related to Layer 12
CREATE TABLE IF NOT EXISTS layer_12_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add an index for faster lookups on 'config_key'
CREATE INDEX IF NOT EXISTS idx_layer_12_config_key ON layer_12_config (config_key);

-- Trigger for layer_12_config updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_layer_12_config_updated_at') THEN
        CREATE TRIGGER trg_layer_12_config_updated_at
        BEFORE UPDATE ON layer_12_config
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;