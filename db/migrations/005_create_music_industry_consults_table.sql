-- SYNOPSIS: Database migration — 005_create_music_industry_consults_table.sql.
CREATE TABLE IF NOT EXISTS music_industry_consults (
    id SERIAL PRIMARY KEY,
    consultant_name VARCHAR(255) NOT NULL,
    consultant_company VARCHAR(255),
    consultation_date DATE NOT NULL,
    topic TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a trigger to automatically update the 'updated_at' column on each row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_music_industry_consults_updated_at') THEN
        CREATE TRIGGER set_music_industry_consults_updated_at
        BEFORE UPDATE ON music_industry_consults
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;