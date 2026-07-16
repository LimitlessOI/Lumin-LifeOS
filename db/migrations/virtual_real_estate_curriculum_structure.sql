-- db/migrations/virtual_real_estate_curriculum_structure.sql
-- SYNOPSIS: This migration creates the curriculum structure for the virtual real estate class.

DO $$
BEGIN
  -- Create table for curriculum modules if it does not exist
  CREATE TABLE IF NOT EXISTS curriculum_modules (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create table for students if it does not exist
  CREATE TABLE IF NOT EXISTS students (
    student_id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create table for student enrollments if it does not exist
  CREATE TABLE IF NOT EXISTS student_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(student_id),
    module_id INTEGER REFERENCES curriculum_modules(module_id),
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
END $$;
