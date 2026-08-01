-- SYNOPSIS: Database migration — 20241030_create_additional_templates.sql.
-- Adds the blueprint column to additional_templates. The table itself is
-- created by 20241001_add_more_templates.sql, which runs before this file.
-- CREATE TABLE IF NOT EXISTS additional_templates (id BIGSERIAL PRIMARY KEY); -- guarded by 20241001
ALTER TABLE IF EXISTS additional_templates
ADD COLUMN IF NOT EXISTS blueprint BOOLEAN DEFAULT FALSE;
