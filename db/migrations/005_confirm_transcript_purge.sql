-- SYNOPSIS: Database migration — 005_confirm_transcript_purge.sql.
-- db/migrations/005_confirm_transcript_purge.sql
-- This file is intentionally a no-op. The original script referenced `settings` and
-- `feature_flags` tables that do not exist in the current schema; the transcript
-- purge behavior is enforced by application cron configuration.
DO $$
BEGIN
  -- no-op
END $$;
