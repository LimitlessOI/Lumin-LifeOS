-- SYNOPSIS: Database migration — 20260704_create_music_practice_sessions.sql.
-- Music Talent Studio
-- Blueprint MTS-P1-003
-- Create table for storing music practice session data.

CREATE TABLE IF NOT EXISTS music_practice_sessions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  recording_url TEXT,
  duration_seconds INTEGER,
  song_worked_on TEXT,
  ai_analysis JSONB,
  teacher_reviewed BOOLEAN DEFAULT FALSE NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_music_practice_sessions_student_id
  ON music_practice_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_music_practice_sessions_session_date
  ON music_practice_sessions (session_date);