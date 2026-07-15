-- SYNOPSIS: Database migration — 20260719_lifeos_core_phase_5.sql.
CREATE TABLE IF NOT EXISTS phase_5_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS phase_5_table
ADD COLUMN IF NOT EXISTS description TEXT;