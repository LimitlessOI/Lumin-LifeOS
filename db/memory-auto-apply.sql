-- SYNOPSIS: SQL — memory-auto-apply.sql.
-- Ensure memory system integrity by auto-applying necessary changes

-- Create memory_system table if it doesn't exist
CREATE TABLE IF NOT EXISTS memory_system (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add a new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_name='memory_system' 
        AND column_name='last_updated'
    ) THEN
        ALTER TABLE memory_system ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update last_updated timestamp on any modification
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'set_last_updated'
    ) THEN
        CREATE TRIGGER set_last_updated
        BEFORE UPDATE ON memory_system
        FOR EACH ROW
        EXECUTE FUNCTION update_last_updated_column();
    END IF;
END $$;

-- Create a summary view if it doesn't exist
CREATE VIEW IF NOT EXISTS memory_system_summary AS
SELECT id, name, description, created_at, last_updated
FROM memory_system;

-- Verify integrity check
DO $$
BEGIN
    PERFORM * FROM memory_system LIMIT 1;
    RAISE NOTICE 'Integrity check auto-apply successful';
END $$;