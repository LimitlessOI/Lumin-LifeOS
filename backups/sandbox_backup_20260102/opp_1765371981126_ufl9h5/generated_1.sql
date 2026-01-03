-- File: migrations/001_create_customers_table.sql
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_data JSONB NOT NULL, -- Storing personal details securely with encryption handled in the application layer.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);