-- SYNOPSIS: Database migration — 20260721_lifeos_core_phase_7.sql.
CREATE TABLE IF NOT EXISTS phase_7_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS some_existing_table
ADD COLUMN IF NOT EXISTS phase_7_data VARCHAR(255);