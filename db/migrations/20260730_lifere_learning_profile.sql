-- SYNOPSIS: Database migration — add metadata JSONB column to lifere_coaching_sessions for learning profile.

ALTER TABLE lifere_coaching_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
