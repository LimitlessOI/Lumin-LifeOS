-- SYNOPSIS: Database migration — 20260704_create_music_students.sql.
-- PostgreSQL migration for Music Talent Studio: music_students

CREATE TABLE IF NOT EXISTS music_students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  instrument TEXT[],
  genres TEXT[],
  current_level TEXT,
  goals TEXT,
  artists_love TEXT[],
  started_at DATE,
  teacher_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_music_students_user_id ON music_students (user_id);
CREATE INDEX IF NOT EXISTS idx_music_students_teacher_id ON music_students (teacher_id);