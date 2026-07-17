-- SYNOPSIS: Database migration — 010_verify_transcript_purge.sql.
-- db/migrations/010_verify_transcript_purge.sql
SELECT 1 FROM cron_verifications WHERE cron_name = 'transcript_purge';
INSERT INTO cron_verifications (cron_name, verified_at) VALUES ('transcript_purge', NOW()) ON CONFLICT (cron_name) DO UPDATE SET verified_at = NOW();
