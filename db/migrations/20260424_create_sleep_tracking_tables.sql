-- SYNOPSIS: Database migration — 20260424_create_sleep_tracking_tables.sql.
CREATE TABLE IF NOT EXISTS sleep_logs (
    id SERIAL PRIMARY KEY,
    bedtime TIMESTAMP NOT NULL,
    wake_time TIMESTAMP NOT NULL,
    quality INTEGER CHECK (quality >= 1 AND quality <= 10),
    dreams TEXT,
    hrv INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend health-intelligence connections
-- Add any relevant foreign keys or relationships as needed for your application.
ALTER TABLE IF EXISTS sleep_logs
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);