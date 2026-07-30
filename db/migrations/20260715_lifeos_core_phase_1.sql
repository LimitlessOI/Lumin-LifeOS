-- SYNOPSIS: Database migration — 20260715_lifeos_core_phase_1.sql.
CREATE TABLE IF NOT EXISTS lifeos_core_phase_1_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lifeos_core_phase_1_name ON lifeos_core_phase_1_table (name);

-- Add a column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifeos_core_phase_1_table' AND column_name = 'status') THEN
        ALTER TABLE lifeos_core_phase_1_table ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- Update the 'updated_at' column automatically on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lifeos_core_phase_1_updated_at') THEN
        CREATE TRIGGER trg_lifeos_core_phase_1_updated_at
        BEFORE UPDATE ON lifeos_core_phase_1_table
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;