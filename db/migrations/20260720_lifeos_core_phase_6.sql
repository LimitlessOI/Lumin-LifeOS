-- SYNOPSIS: Database migration — 20260720_lifeos_core_phase_6.sql.
CREATE TABLE IF NOT EXISTS phase_6_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);