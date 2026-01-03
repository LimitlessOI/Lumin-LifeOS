-- File: migrations/002_create_reviews_table.sql
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    code TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'in_progress', 'completed')),
    comment TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);