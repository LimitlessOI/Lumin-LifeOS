-- SYNOPSIS: Database migration — 005_confirm_transcript_purge.sql.
-- db/migrations/005_confirm_transcript_purge.sql

BEGIN;

-- Check if the feature flag for transcript purge confirmation already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM feature_flags WHERE feature_name = 'transcript_purge_confirmed') THEN
    -- Insert confirmation record for transcript purge feature
    INSERT INTO feature_flags (feature_name, is_enabled, created_at)
    VALUES ('transcript_purge_confirmed', TRUE, NOW());
  END IF;
END $$;

COMMIT;
