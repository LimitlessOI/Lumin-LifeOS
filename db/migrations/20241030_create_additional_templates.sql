-- SYNOPSIS: Database migration — 20241030_create_additional_templates.sql.
CREATE TABLE IF NOT EXISTS additional_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS additional_templates
ADD COLUMN IF NOT EXISTS blueprint BOOLEAN DEFAULT FALSE;