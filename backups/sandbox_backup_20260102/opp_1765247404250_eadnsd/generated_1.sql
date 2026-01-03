===FILE:db/migrate/2023_XXXXXX_create_users_table.sql===
BEGIN TRANSACTION;
-- Ensure table is dropped if it exists and then created anew with the appropriate schema for GDPR compliance where necessary (e.g., using hashed personal info)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Assuming passwords are stored as hashes for security purposes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Define index on the user's email if necessary to improve search performance (e.01:DATABASE MIGRATION FILE FOR USER TABLE IN postgresql===CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);===END OF DATABASE MIGRATION FILE===