-- SYNOPSIS: Database migration — 20240604_tc_feedback.sql.
CREATE TABLE IF NOT EXISTS tc_feedback (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    feedback_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);