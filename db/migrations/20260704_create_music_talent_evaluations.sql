-- SYNOPSIS: Database migration — 20260704_create_music_talent_evaluations.sql.
-- Create table for storing music talent evaluation data
CREATE TABLE IF NOT EXISTS music_talent_evaluations (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  submission_url TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  genre TEXT,
  scores JSONB,
  overall_percentile NUMERIC(5,2),
  improvement_velocity NUMERIC(5,3),
  development_flag BOOLEAN DEFAULT FALSE NOT NULL,
  evaluator_notes TEXT,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_music_talent_evaluations_student_id
  ON music_talent_evaluations (student_id);

CREATE INDEX IF NOT EXISTS idx_music_talent_evaluations_evaluated_at
  ON music_talent_evaluations (evaluated_at);