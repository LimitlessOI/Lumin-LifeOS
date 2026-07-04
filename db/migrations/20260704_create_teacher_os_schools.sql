-- SYNOPSIS: Database migration — 20260704_create_teacher_os_schools.sql.
CREATE TABLE IF NOT EXISTS teacher_os_schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  state TEXT,
  license_type TEXT,
  seat_count INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_os_schools_name ON teacher_os_schools (name);
CREATE INDEX IF NOT EXISTS idx_teacher_os_schools_district ON teacher_os_schools (district);
CREATE INDEX IF NOT EXISTS idx_teacher_os_schools_state ON teacher_os_schools (state);
CREATE INDEX IF NOT EXISTS idx_teacher_os_schools_license_type ON teacher_os_schools (license_type);
CREATE INDEX IF NOT EXISTS idx_teacher_os_schools_expires_at ON teacher_os_schools (expires_at);