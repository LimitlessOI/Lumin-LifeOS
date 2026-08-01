-- SYNOPSIS: Database migration — 001_create_competency_standards.sql.
CREATE TABLE IF NOT EXISTS competency_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    standard TEXT NOT NULL,
    level TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competency_standards_domain ON competency_standards (domain);
CREATE INDEX IF NOT EXISTS idx_competency_standards_domain_level ON competency_standards (domain, level);