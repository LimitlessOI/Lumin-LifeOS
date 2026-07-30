-- SYNOPSIS: Database migration — 20260719_lifeos_core_phase_5.sql.
CREATE TABLE IF NOT EXISTS phase_5_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);