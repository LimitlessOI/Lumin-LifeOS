-- SYNOPSIS: Database migration — 009_create_legal_structure_for_accreditation_institution.sql.
CREATE TABLE IF NOT EXISTS legal_structure (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
