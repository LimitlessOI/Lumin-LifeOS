-- SYNOPSIS: Database migration — intentionally a no-op. Table `competency_standards` is created by `001_create_competency_standards.sql` with a different schema.
-- @ssot docs/products/lumin-university/PRODUCT_HOME.md

-- This migration previously contained a broken INSERT statement with a TODO comment inside the
-- value list, causing a syntax error. It also targeted a `competency_standards` schema
-- (`domain`, `competency`, `definition`) that collides with the canonical table created by
-- `001_create_competency_standards.sql` (`name`, `description`, `domain`, `standards`).
-- It is now a no-op to prevent migration failures and schema drift.
