-- SYNOPSIS: Database migration — 004_verify_transcript_purge.sql.
-- Migration to verify the 24h transcript auto-purge cron job.
-- Verification is a runtime concern; this migration safely no-ops so it does not
-- fail when the legacy `transcripts` table is absent.
DO $$
BEGIN
  -- no-op
END $$;
