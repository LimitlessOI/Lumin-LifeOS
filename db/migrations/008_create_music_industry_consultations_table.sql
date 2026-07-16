-- SYNOPSIS: Database migration — 008_create_music_industry_consultations_table.sql.
CREATE TABLE IF NOT EXISTS music_industry_consultations (
    id SERIAL PRIMARY KEY,
    consultant_name VARCHAR(100) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    consultation_date DATE NOT NULL,
    consultation_duration INTEGER NOT NULL, -- Duration in minutes
    consultation_topic TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
