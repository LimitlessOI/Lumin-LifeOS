-- SYNOPSIS: Database migration — 20260424_create_sleep_tracking_tables.sql.
-- db/migrations/20260424_create_sleep_tracking_tables.sql
-- This file is intentionally a no-op. It previously contained MySQL-only
-- `ON UPDATE CURRENT_TIMESTAMP` syntax and a `CREATE TABLE sleep_logs` without
-- `IF NOT EXISTS`, which collides with the `sleep_logs` table already created by
-- `20260420_lifeos_phase2_schema.sql`.
CREATE TABLE IF NOT EXISTS sleep_logs (
  bedtime TIMESTAMP,
  wake_time TIMESTAMP,
  quality INT,
  dreams TEXT,
  HRV FLOAT
);

-- Extend health-intelligence connections
