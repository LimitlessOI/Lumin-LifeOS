-- SYNOPSIS: Database migration — add_doctrine_profiles.sql.
CREATE TABLE IF NOT EXISTS DoctrineProfiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);