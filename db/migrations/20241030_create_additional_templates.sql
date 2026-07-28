-- SYNOPSIS: Database migration — 20241030_create_additional_templates.sql.
-- The CREATE TABLE this filename implies was removed 2026-07-28: the table is
-- created by 20241001_add_more_templates.sql, which always sorts first, so the
-- copy here was a permanent IF-NOT-EXISTS no-op. The blueprint column below is
-- the only statement unique to this migration.
ALTER TABLE IF EXISTS additional_templates
ADD COLUMN IF NOT EXISTS blueprint BOOLEAN DEFAULT FALSE;
