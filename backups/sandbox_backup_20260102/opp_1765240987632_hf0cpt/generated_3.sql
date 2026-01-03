-- File: migrations/003_create_billing_info_table.sql
CREATE TABLE IF NOT EXISTS billing_info (
    client_id INT REFERENCES client_info(id),
    invoice_number VARCHAR(20) UNIQUE,
    amount_due NUMERIC(10, 2),
    balance_owed FLOAT DEFAULT 0.0 CHECK (balance_owed >= 0.0),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WIT1D OFFSET 3600
);