-- SYNOPSIS: Database migration — 20241001_add_template_choices.sql.
CREATE TABLE IF NOT EXISTS template_choices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);