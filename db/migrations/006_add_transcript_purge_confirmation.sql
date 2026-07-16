-- SYNOPSIS: Database migration — 006_add_transcript_purge_confirmation.sql.
-- 006_add_transcript_purge_confirmation.sql

CREATE TABLE IF NOT EXISTS transcript_purge_confirmation (
    id SERIAL PRIMARY KEY,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optionally, add logic to check or update the 24-hour purge status
-- This could be done with a scheduled task that clears old entries
