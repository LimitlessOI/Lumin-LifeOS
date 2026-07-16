-- SYNOPSIS: Database migration — amendment_21_layer_12.sql.
-- Migration script for Layer 12 schema

-- Create layer_12_users table
CREATE TABLE IF NOT EXISTS layer_12_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  last_login TIMESTAMP
);

-- Create layer_12_products table
CREATE TABLE IF NOT EXISTS layer_12_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT
);

-- Ensure all tables use IF NOT EXISTS to prevent errors if they are already present
