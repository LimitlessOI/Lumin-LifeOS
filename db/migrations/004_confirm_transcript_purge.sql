-- SYNOPSIS: Database migration — 004_confirm_transcript_purge.sql.
-- Check for transcripts older than 24 hours
SELECT COUNT(*) AS old_transcripts
FROM transcripts
WHERE created_at < NOW() - INTERVAL '24 HOURS';

-- Add a log entry or raise an alert if any old transcripts are found
DO $$
BEGIN
   IF (SELECT COUNT(*) FROM transcripts WHERE created_at < NOW() - INTERVAL '24 HOURS') > 0 THEN
      RAISE NOTICE 'Old transcripts exist, auto-purge not confirmed.';
   ELSE
      RAISE NOTICE 'Auto-purge is functioning correctly.';
   END IF;
   
   -- Insert verification record
   INSERT INTO cron_verification (cron_name, execution_time, status)
   VALUES ('transcript_purge', NOW(), 'checked');
END $$;

-- Verification step
SELECT * FROM cron_verification WHERE cron_name = 'transcript_purge';
