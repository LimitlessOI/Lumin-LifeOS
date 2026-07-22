-- SYNOPSIS: Database migration — 20241001_add_more_templates.sql.
CREATE TABLE IF NOT EXISTS additional_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);