-- SYNOPSIS: Align socialmediaos_sessions + content_packs with Railway production schema.
-- MOS-P1-FIX: Railway schema has `platform` on sessions and `name` on content_packs; local and fresh clones need them.
ALTER TABLE IF EXISTS socialmediaos_sessions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'general';

ALTER TABLE IF EXISTS socialmediaos_content_packs
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Social Media OS Content Pack';
