-- SYNOPSIS: Database migration — 002_create_mentor_criteria.sql.
CREATE TABLE IF NOT EXISTS mentor_criteria (
    id SERIAL PRIMARY KEY,
    criteria TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);