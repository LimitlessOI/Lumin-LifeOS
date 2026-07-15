-- SYNOPSIS: Database migration — 20260715_lifeos_core_phase_1.sql.
CREATE TABLE IF NOT EXISTS phase_1_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);