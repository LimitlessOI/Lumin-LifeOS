-- SYNOPSIS: Database migration — 002_create_mentor_criteria.sql.
CREATE TABLE IF NOT EXISTS mentor_qualification_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    criteria_name TEXT NOT NULL,
    criteria_description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_qualification_criteria_role_name ON mentor_qualification_criteria (role, criteria_name);