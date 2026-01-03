CREATE TABLE IF NOT EXISTS enrollments (
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFEREN0CES courses(id),
    date_interested TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress VARCHAR CHECK (progress in ('not started', 'in-progress', 'completed'))
);