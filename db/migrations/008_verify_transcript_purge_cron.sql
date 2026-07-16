-- SYNOPSIS: Database migration — 008_verify_transcript_purge_cron.sql.
-- Migration version: 008
-- Migration purpose: Log the execution of the transcript purge cron job

-- Step 1: Ensure the log table for cron verification exists
CREATE TABLE IF NOT EXISTS cron_verification_logs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create a function to log the cron job execution
CREATE OR REPLACE FUNCTION log_transcript_purge_cron() RETURNS VOID AS $$
BEGIN
    INSERT INTO cron_verification_logs (job_name, executed_at)
    VALUES ('transcript_purge', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Schedule the cron job with logging
-- Assuming you are using a cron scheduler like pg_cron or another system
-- Here's how you might call the logging function within the cron job
-- This part is usually handled outside of a SQL migration, but shown here for completeness

-- Example for pg_cron:
-- SELECT cron.schedule('*/5 * * * *', $$BEGIN PERFORM log_transcript_purge_cron(); END;$$);

-- Note: Adjust the cron schedule as needed for your specific requirements

COMMIT;
