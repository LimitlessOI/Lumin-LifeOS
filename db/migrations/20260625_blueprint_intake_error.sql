-- SYNOPSIS: Database migration — 20260625_blueprint_intake_error.sql.
-- Add error_message column to blueprint_intake_sessions for background job diagnostics.
ALTER TABLE blueprint_intake_sessions ADD COLUMN IF NOT EXISTS error_message TEXT;
