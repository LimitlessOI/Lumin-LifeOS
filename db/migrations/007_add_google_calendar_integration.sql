-- SYNOPSIS: Database migration — 007_add_google_calendar_integration.sql.
CREATE TABLE IF NOT EXISTS google_calendar_integration (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Optionally, you can add indexes or constraints as needed
-- CREATE INDEX idx_google_calendar_user_id ON google_calendar_integration(user_id);
