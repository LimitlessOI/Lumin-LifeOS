// migrations/001_create_table.sql - Neon PostgreSQL database migration file (simplified)
-- truncate existing tables if they exist to start clean -- assuming this is a script run before deploying new changes: 
TRUNCATE TABLE users;
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user' -- assuming roles are either admin or user for simplicity 
);
-- more tables and relationships would be defined here...