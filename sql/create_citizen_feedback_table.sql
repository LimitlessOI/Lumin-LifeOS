CREATE TABLE citizen_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);