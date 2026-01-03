-- File: migrations/003_create_payments_table.sql
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(19, 4) CHECK ($amount >= 0),
    currency VARCHAR(5) DEFAULT 'USD',
    reference UUID NOT NULL UNIQUE, -- Assuming we're using pgcrypto extension for uuid generation.
    paymentStatus BOOLEAN DEFAULT TRUE
);