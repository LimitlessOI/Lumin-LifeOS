-- SYNOPSIS: Database migration — 20260722_lifeos_core_phase_8.sql.
CREATE TABLE IF NOT EXISTS phase_8_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);