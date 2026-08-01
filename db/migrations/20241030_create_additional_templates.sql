-- SYNOPSIS: Database migration — 20241030_create_additional_templates.sql.
-- @ssot docs/products/site-builder/PRODUCT_HOME.md
-- The CREATE TABLE this filename implies was removed 2026-07-28: the table is
-- created by 20241001_add_more_templates.sql, which always sorts first, so the
-- copy here was a permanent IF-NOT-EXISTS no-op. The blueprint column below is
-- the only statement unique to this migration.
ALTER TABLE IF EXISTS additional_templates
ADD COLUMN IF NOT EXISTS blueprint BOOLEAN DEFAULT FALSE;

-- Add a new template option to the existing site_builder_templates table.
-- This extends the design choices available for site-builder.
ALTER TABLE IF EXISTS site_builder_templates
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'standard';