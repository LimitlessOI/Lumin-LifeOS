-- SYNOPSIS: Database migration — 001_create_competency_standards.sql.
CREATE TABLE IF NOT EXISTS competency_standards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain TEXT,
    standards TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);