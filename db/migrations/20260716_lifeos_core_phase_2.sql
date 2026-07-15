-- SYNOPSIS: Database migration — 20260716_lifeos_core_phase_2.sql.
CREATE TABLE IF NOT EXISTS phase_2_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS another_table
ADD COLUMN IF NOT EXISTS phase_2_data JSONB DEFAULT '{}';