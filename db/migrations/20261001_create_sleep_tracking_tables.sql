-- SYNOPSIS: Database migration — 20261001_create_sleep_tracking_tables.sql.
CREATE TABLE IF NOT EXISTS sleep_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    sleep_date DATE NOT NULL,
    sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
    sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTERVAL GENERATED ALWAYS AS (sleep_end - sleep_start) STORED,
    quality INTEGER CHECK (quality >= 1 AND quality <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add necessary indexes
CREATE INDEX idx_sleep_logs_user_id ON sleep_logs(user_id);
CREATE INDEX idx_sleep_logs_sleep_date ON sleep_logs(sleep_date);

-- Foreign key constraint to reference users table
ALTER TABLE sleep_logs
ADD CONSTRAINT fk_sleep_logs_user_id
FOREIGN KEY (user_id) REFERENCES users(id);
