-- SYNOPSIS: Database migration — addPwaTrackingTable.sql.
CREATE TABLE IF NOT EXISTS pwa_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    installation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);