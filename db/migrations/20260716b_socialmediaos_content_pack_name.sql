-- SYNOPSIS: Add name column to socialmediaos_content_packs for fresh clones.
-- MOS-P1-FIX: Production Railway schema already has name NOT NULL.
ALTER TABLE IF EXISTS socialmediaos_content_packs
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Social Media OS Content Pack';
