-- SYNOPSIS: Database migration — 002_add_transcript_purge_cron.sql.
CREATE TABLE IF NOT EXISTS transcript_purge_cron (
    id SERIAL PRIMARY KEY,
    last_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'success'
);