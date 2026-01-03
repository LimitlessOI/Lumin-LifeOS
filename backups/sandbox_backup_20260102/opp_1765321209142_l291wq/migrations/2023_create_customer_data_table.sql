CREATE TABLE IF NOT EXISTS customer_data (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}'
);

ALTER TABLE agent ADD COLUMN specialization TEXT;

ALTER TABLE tickets ADD COLUMN priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium';