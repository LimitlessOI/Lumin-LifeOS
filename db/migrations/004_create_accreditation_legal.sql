-- SYNOPSIS: Database migration — 004_create_accreditation_legal.sql.
CREATE TABLE IF NOT EXISTS accreditation_legal_structure (
    id SERIAL PRIMARY KEY,
    structure TEXT NOT NULL
);