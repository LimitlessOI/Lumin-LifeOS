-- SYNOPSIS: Database migration — 20260704_create_teacher_os_students.sql.
-- teacher_os_students stores student information for Teacher OS
CREATE TABLE IF NOT EXISTS teacher_os_students (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  grade_level TEXT,
  learning_style JSONB,
  engagement_profile JSONB,
  interests TEXT[],
  confidence_baseline NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_os_students_teacher_id
  ON teacher_os_students (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_os_students_grade_level
  ON teacher_os_students (grade_level);