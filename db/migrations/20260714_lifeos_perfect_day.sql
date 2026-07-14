-- SYNOPSIS: Database migration — 20260714_lifeos_perfect_day.sql.
CREATE TABLE IF NOT EXISTS perfect_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wake_time time,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS perfect_day_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  perfect_day_id uuid REFERENCES perfect_day(id),
  rating smallint,
  note text,
  what_mattered_more text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS perfect_day_user_id_idx ON perfect_day(user_id);
CREATE INDEX IF NOT EXISTS perfect_day_ratings_user_id_idx ON perfect_day_ratings(user_id);
