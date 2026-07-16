-- SYNOPSIS: Database migration — 010_create_detailed_competency_standards.sql.
CREATE TABLE IF NOT EXISTS detailed_competency_standards (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    skill_description TEXT NOT NULL,
    required_level VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
