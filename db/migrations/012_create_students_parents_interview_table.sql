-- SYNOPSIS: Database migration — 012_create_students_parents_interview_table.sql.
CREATE TABLE IF NOT EXISTS students_parents_interview (
    id SERIAL PRIMARY KEY,
    interviewee_type VARCHAR(10) NOT NULL CHECK (interviewee_type IN ('student', 'parent')),
    interviewee_id INT NOT NULL,
    interview_date DATE NOT NULL,
    interview_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
