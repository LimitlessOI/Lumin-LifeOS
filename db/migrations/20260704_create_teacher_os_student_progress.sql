-- SYNOPSIS: Database migration — 20260704_create_teacher_os_student_progress.sql.
-- TOS-P1-004: teacher_os_student_progress
CREATE TABLE IF NOT EXISTS teacher_os_student_progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  date DATE NOT NULL,
  subject TEXT,
  mastery_level NUMERIC(3,1),
  growth_edge TEXT,
  win_note TEXT,
  teacher_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_os_student_progress_student_id
  ON teacher_os_student_progress (student_id);

CREATE INDEX IF NOT EXISTS idx_teacher_os_student_progress_date
  ON teacher_os_student_progress (date);

CREATE INDEX IF NOT EXISTS idx_teacher_os_student_progress_student_id_date
  ON teacher_os_student_progress (student_id, date);