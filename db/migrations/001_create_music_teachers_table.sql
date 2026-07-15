-- SYNOPSIS: Database migration — 001_create_music_teachers_table.sql.
CREATE TABLE IF NOT EXISTS music_teachers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    instrument_specialty VARCHAR(100),
    years_of_experience INT,
    availability TEXT,
    interview_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);