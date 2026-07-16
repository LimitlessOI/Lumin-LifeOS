-- SYNOPSIS: Database migration — 20231028_create_vapi_account.sql.
CREATE TABLE IF NOT EXISTS vapi_account (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);