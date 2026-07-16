-- SYNOPSIS: Add platform column to socialmediaos_sessions if it is missing.
-- MOS-P1-FIX: Railway schema already has `platform NOT NULL`; local and fresh clones need it.
ALTER TABLE IF EXISTS socialmediaos_sessions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'general';
