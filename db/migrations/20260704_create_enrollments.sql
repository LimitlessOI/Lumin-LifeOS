-- SYNOPSIS: Database migration — 20260704_create_enrollments.sql.
-- LU-P1-003: Create enrollments table to link students and courses.

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON enrollments (created_at);