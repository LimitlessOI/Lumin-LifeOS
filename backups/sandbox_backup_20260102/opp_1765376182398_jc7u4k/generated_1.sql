-- File: migrations/001_create_table.sql ===START OF FILE===
CREATE TABLE IF NOT EXISTS business_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    size DECIMAL,
    description TEXT
);
-- Add necessary indexes for optimization below this line. --END OF FILE===