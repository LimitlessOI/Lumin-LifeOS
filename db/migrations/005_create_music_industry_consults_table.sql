-- SYNOPSIS: Database migration — 005_create_music_industry_consults_table.sql.
CREATE TABLE IF NOT EXISTS music_industry_consults (
    id SERIAL PRIMARY KEY,
    professional_name VARCHAR(255) NOT NULL,
    consultation_date DATE NOT NULL,
    topics_discussed TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);