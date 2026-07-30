-- SYNOPSIS: Database migration — 20260716_lifeos_core_phase_2.sql.
CREATE TABLE IF NOT EXISTS phase_2_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE phase_2_table ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE phase_2_table ADD COLUMN IF NOT EXISTS due_date DATE;