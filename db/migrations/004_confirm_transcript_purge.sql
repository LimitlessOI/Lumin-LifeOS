-- SYNOPSIS: Database migration — 004_confirm_transcript_purge.sql.
-- Check for transcripts older than 24 hours; no-op if transcripts/cron_verification tables do not exist.

CREATE TABLE IF NOT EXISTS cron_verification (
    cron_name VARCHAR(255) PRIMARY KEY,
    execution_time TIMESTAMPTZ,
    status VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
   IF EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'transcripts'
   ) THEN
      IF (SELECT COUNT(*) FROM transcripts WHERE created_at < NOW() - INTERVAL '24 HOURS') > 0 THEN
         RAISE NOTICE 'Old transcripts exist, auto-purge not confirmed.';
      ELSE
         RAISE NOTICE 'Auto-purge is functioning correctly.';
      END IF;
   ELSE
      RAISE NOTICE 'transcripts table not present; skipping purge check.';
   END IF;

   -- Insert verification record idempotently
   IF NOT EXISTS (SELECT 1 FROM cron_verification WHERE cron_name = 'transcript_purge') THEN
      INSERT INTO cron_verification (cron_name, execution_time, status)
      VALUES ('transcript_purge', NOW(), 'checked');
   END IF;
END $$;

-- Verification step
SELECT * FROM cron_verification WHERE cron_name = 'transcript_purge';
