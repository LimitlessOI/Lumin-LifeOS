-- SYNOPSIS: Database migration — intentionally a no-op. The sleep_logs table is created by 20260420_lifeos_phase2_schema.sql.
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

-- This migration previously contained MySQL-only `ON UPDATE CURRENT_TIMESTAMP` syntax
-- and a `CREATE TABLE sleep_logs` without `IF NOT EXISTS`, which collided with the
-- `sleep_logs` table already created by 20260420_lifeos_phase2_schema.sql.
-- It is now intentionally a no-op.
