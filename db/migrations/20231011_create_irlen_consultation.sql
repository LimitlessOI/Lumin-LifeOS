-- SYNOPSIS: Database migration — 20231011_create_irlen_consultation.sql.
CREATE TABLE IF NOT EXISTS irlen_consultation (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);