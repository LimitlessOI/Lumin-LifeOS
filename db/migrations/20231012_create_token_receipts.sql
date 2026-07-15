-- SYNOPSIS: Database migration — 20231012_create_token_receipts.sql.
CREATE TABLE IF NOT EXISTS token_receipts (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);