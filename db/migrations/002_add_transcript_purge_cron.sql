-- SYNOPSIS: Database migration — 002_add_transcript_purge_cron.sql.
CREATE TABLE IF NOT EXISTS transcript_purge_operations (
    id SERIAL PRIMARY KEY,
    operation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL,
    records_purged INTEGER NOT NULL
);