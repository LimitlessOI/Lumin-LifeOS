-- SYNOPSIS: Database migration — 20260704_create_teacher_os_teachers.sql.
CREATE TABLE IF NOT EXISTS teacher_os_teachers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  school_id INTEGER,
  grade_levels TEXT[],
  subjects TEXT[],
  class_size_avg INTEGER,
  district TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_os_teachers_user_id ON teacher_os_teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_os_teachers_school_id ON teacher_os_teachers (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_os_teachers_state ON teacher_os_teachers (state);