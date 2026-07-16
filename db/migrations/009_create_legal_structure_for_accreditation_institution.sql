-- SYNOPSIS: Database migration — 009_create_legal_structure_for_accreditation_institution.sql.
CREATE TABLE IF NOT EXISTS legal_structure (
    id SERIAL PRIMARY KEY,
    institution_name VARCHAR(255) NOT NULL,
    legal_status VARCHAR(100) NOT NULL,
    registration_number VARCHAR(100) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    contact_email VARCHAR(255),
    established_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
