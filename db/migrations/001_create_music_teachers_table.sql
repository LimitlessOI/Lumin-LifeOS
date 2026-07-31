-- SYNOPSIS: Database migration — 001_create_music_teachers_table.sql.
CREATE TABLE IF NOT EXISTS music_teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    instrument VARCHAR(255),
    experience_years INTEGER,
    interview_date DATE,
    notes TEXT
);