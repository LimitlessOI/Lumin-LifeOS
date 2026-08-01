-- SYNOPSIS: Database migration — 001_create_competency_standards.sql.
CREATE TABLE IF NOT EXISTS lumin_competency_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_competency_standards_user_id ON lumin_competency_standards (user_id);
CREATE INDEX IF NOT EXISTS idx_lumin_competency_standards_category ON lumin_competency_standards (category);
CREATE INDEX IF NOT EXISTS idx_lumin_competency_standards_level ON lumin_competency_standards (level);

-- Add a trigger to update the 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lumin_competency_standards_updated_at ON lumin_competency_standards;
CREATE TRIGGER trg_lumin_competency_standards_updated_at
BEFORE UPDATE ON lumin_competency_standards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

--