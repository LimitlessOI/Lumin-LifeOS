-- SYNOPSIS: Database migration — addStruggleDetectionLogTable.sql.
CREATE TABLE IF NOT EXISTS struggle_detection_log (
    id SERIAL PRIMARY KEY,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    struggle_type VARCHAR(255) NOT NULL,
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE
);