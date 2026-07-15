-- SYNOPSIS: Database migration — 20231011_create_irlen_consultation.sql.
CREATE TABLE IF NOT EXISTS irlen_consultation_feedback (
    id SERIAL PRIMARY KEY,
    participant_name VARCHAR(255) NOT NULL,
    feedback_text TEXT NOT NULL,
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);