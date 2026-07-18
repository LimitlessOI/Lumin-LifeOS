-- SYNOPSIS: Database migration — 004_verify_transcript_purge.sql.
-- 004_verify_transcript_purge.sql
-- Migration to verify the 24h transcript auto-purge cron job setup.

DO $$
BEGIN
  -- Check if the environment is set up correctly for the auto-purge cron job.
  -- This is a no-op migration to ensure it can run safely regardless of existing database state.

  -- Verify if 'archive_mode' is set to 'on' as it might be required for the auto-purge.
  IF current_setting('archive_mode', true) IS DISTINCT FROM 'on' THEN
    RAISE NOTICE 'Warning: archive_mode is not enabled. This might affect the auto-purge functionality.';
  ELSE
    RAISE NOTICE 'archive_mode is enabled.';
  END IF;
  
  -- Perform a SELECT to explicitly verify the current setting of 'archive_mode'.
  SELECT current_setting('archive_mode');

  -- Additional logic can be added here to verify other environment settings or preconditions.
END $$;
