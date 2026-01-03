-- File: migrations/002_create_overlays_table.sql ===END FILE===
CREATE TABLE IF NOT EXISTS overlays (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active'
);