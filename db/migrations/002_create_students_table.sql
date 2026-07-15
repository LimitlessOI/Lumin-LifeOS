-- SYNOPSIS: Database migration — 002_create_students_table.sql.
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    interview_date DATE,
    role VARCHAR(50) CHECK (role IN ('student', 'parent')),
    contact_info JSONB
);