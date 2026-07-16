-- SYNOPSIS: Database migration — create builder_os_token_receipts table.
-- @ssot docs/products/builderos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS builder_os_token_receipts (
    id SERIAL PRIMARY KEY,
    build_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
