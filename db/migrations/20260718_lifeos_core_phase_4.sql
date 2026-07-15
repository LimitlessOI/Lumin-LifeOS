-- SYNOPSIS: Database migration — 20260718_lifeos_core_phase_4.sql.
-- Phase 4 extension table only. Core users/posts/comments already exist in 001_create_tables.sql.
CREATE TABLE IF NOT EXISTS phase_4_table (
    phase_4_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
