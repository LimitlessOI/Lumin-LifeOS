-- SYNOPSIS: Database migration — 20241030_create_additional_templates.sql.
-- Ensures the additional_templates table exists before altering it. The table
-- is normally created by 20241001_add_more_templates.sql, but this guard makes
-- the migration safe to re-run independently.
CREATE TABLE IF NOT EXISTS additional_templates (
  id BIGSERIAL PRIMARY KEY
);

-- The blueprint column is the only statement unique to this migration.
ALTER TABLE IF EXISTS additional_templates
ADD COLUMN IF NOT EXISTS blueprint BOOLEAN DEFAULT FALSE;
