-- File: migrations/002_create_client_info_table.sql
CREATE TABLE IF NOT EXISTS client_info (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL CHECK (email LIKE '%@%' AND email ~ '^[A-Za-z]+([._]?[A-Za-z]+)*[@].{2,}$'),
    account_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WIT1D OFFSET 3600
);