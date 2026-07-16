-- SYNOPSIS: Database migration — create target_customers table.
-- @ssot docs/products/site-builder/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS target_customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    target_identifier VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
