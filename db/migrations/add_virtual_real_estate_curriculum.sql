-- SYNOPSIS: Database migration — virtual real estate curriculum tables.
CREATE TABLE IF NOT EXISTS virtual_real_estate_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_weeks INT,
    start_date DATE,
    end_date DATE,
    instructor_name VARCHAR(255),
    prerequisites TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add curriculum_id to the existing students table (which may already use UUID ids).
ALTER TABLE students ADD COLUMN IF NOT EXISTS curriculum_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_curriculum_id_fkey'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_curriculum_id_fkey
      FOREIGN KEY (curriculum_id) REFERENCES virtual_real_estate_curriculum(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS curriculum_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID NOT NULL,
    module_title VARCHAR(255) NOT NULL,
    module_description TEXT,
    module_duration_weeks INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_modules_curriculum_id_fkey
      FOREIGN KEY (curriculum_id) REFERENCES virtual_real_estate_curriculum(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    module_id UUID NOT NULL,
    progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT student_progress_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT student_progress_module_id_fkey
      FOREIGN KEY (module_id) REFERENCES curriculum_modules(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS real_estate_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_weeks INT,
    start_date DATE,
    end_date DATE,
    instructor_name VARCHAR(255),
    prerequisites TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);