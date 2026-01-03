-- File: migrations/001_create_table.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(50),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITHO0UT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);