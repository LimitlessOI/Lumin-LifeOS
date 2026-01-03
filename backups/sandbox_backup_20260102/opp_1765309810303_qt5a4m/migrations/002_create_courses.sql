CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    syllabus JSONB,
    expertise_required TEXT[],
    duration INTERVAL DAY TO MONTH,
    status VARCHAR CHECK (status in ('draft', 'published')),
    enrolment_limit INT DEFAULT 10
);