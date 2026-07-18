-- SYNOPSIS: Perfect Day — text user keys + unique rating upsert
-- Founder Perfect Day stores handle keys (e.g. adam), not uuid.

ALTER TABLE perfect_day
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE perfect_day_ratings
  ALTER COLUMN user_id TYPE text USING user_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS perfect_day_ratings_user_day_uidx
  ON perfect_day_ratings (user_id, perfect_day_id);
