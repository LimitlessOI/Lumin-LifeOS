-- SYNOPSIS: Database migration — 20260720_lifeos_core_phase_6.sql.
-- Phase 6 extension table only. Core users/posts/comments already exist in 001_create_tables.sql.
CREATE TABLE IF NOT EXISTS phase_6_table (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);