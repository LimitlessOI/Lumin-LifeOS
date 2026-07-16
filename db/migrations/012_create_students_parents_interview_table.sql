-- SYNOPSIS: Idempotent Postgres migration for the students/parents interview table.
-- @ssot docs/products/music-talent-studio/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS students_parents_interview (
    id SERIAL PRIMARY KEY,
    interviewee_type VARCHAR(10) NOT NULL CHECK (interviewee_type IN ('student', 'parent')),
    interviewee_id INT NOT NULL,
    interview_date DATE NOT NULL,
    interview_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_students_parents_interview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_students_parents_interview_updated_at'
        AND tgrelid = 'students_parents_interview'::regclass
    ) THEN
        CREATE TRIGGER trg_students_parents_interview_updated_at
        BEFORE UPDATE ON students_parents_interview
        FOR EACH ROW
        EXECUTE FUNCTION update_students_parents_interview_updated_at();
    END IF;
END $$;
