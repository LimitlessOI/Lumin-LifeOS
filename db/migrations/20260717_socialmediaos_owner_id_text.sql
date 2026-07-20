-- SYNOPSIS: Allow anonymous/command-key purchasers to buy the SMOS content pack.
-- The founder-builder runtime authenticates overlay users via x-command-key fallback
-- when no JWT is present, so owner_id can be a non-UUID string like 'emergency-key'.
-- Prior UUID values remain valid; new TEXT values are accepted.
-- @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md

ALTER TABLE IF EXISTS socialmediaos_sessions
  ALTER COLUMN owner_id TYPE TEXT USING owner_id::text;

ALTER TABLE IF EXISTS socialmediaos_content_packs
  ALTER COLUMN owner_id TYPE TEXT USING owner_id::text;
