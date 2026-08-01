-- SYNOPSIS: Database migration — 001_create_competency_standards.sql.
CREATE TABLE IF NOT EXISTS competency_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);