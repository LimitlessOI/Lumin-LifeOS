-- SYNOPSIS: Database migration — 20260704_create_music_teachers.sql.
CREATE TABLE IF NOT EXISTS music_teachers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  studio_name TEXT,
  instruments TEXT[],
  genres TEXT[],
  bio TEXT,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_music_teachers_user_id ON music_teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_music_teachers_stripe_account_id ON music_teachers (stripe_account_id);