-- SYNOPSIS: Database migration — 20260717_lifeos_core_phase_3.sql.
CREATE TABLE IF NOT EXISTS phase_3_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS some_existing_table
ADD COLUMN IF NOT EXISTS phase_3_reference INTEGER REFERENCES phase_3_table(id);