-- SYNOPSIS: Database migration — intentionally a no-op. The checkins table is created by 20260716_create_lifeos_checkins_table.sql and extended by 20260725_lifeos_checkins_add_activity_columns.sql.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

-- This migration originally created the checkins table with activity_text and created_at.
-- It is now intentionally a no-op to avoid a CREATE TABLE collision with the canonical
-- checkins table definition in 20260716_create_lifeos_checkins_table.sql.
