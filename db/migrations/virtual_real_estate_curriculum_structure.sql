-- SYNOPSIS: Database migration — virtual_real_estate_curriculum_structure.sql.
-- db/migrations/virtual_real_estate_curriculum_structure.sql
-- This file is intentionally a no-op. The original CREATE TABLE statements duplicate
-- the schema already owned by earlier migrations (e.g. 002_create_students_table.sql)
-- and were missing `IF NOT EXISTS`, causing migration preflight failures on boot.
CREATE TABLE IF NOT EXISTS curriculum_modules (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_curriculum (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id),
  module_id INT REFERENCES curriculum_modules(id),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
