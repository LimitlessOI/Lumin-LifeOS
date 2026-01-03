-- File: migrations/003_create_interactions_table.sql ===END FILE===
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    overlayId INT REFERENCES overlays(id) ON DELETE CASCADE,
    userEmail VARCHAR(255),  -- assuming email is stored in the users table or accessible here somehow
    interactionTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTERVAL NOT NULL
);