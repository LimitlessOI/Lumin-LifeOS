-- SYNOPSIS: Database migration — addStruggleDetectionLogTable.sql.
CREATE TABLE IF NOT EXISTS struggle_detection_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    struggle_type VARCHAR(255) NOT NULL,
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE
);