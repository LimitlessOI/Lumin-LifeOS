CREATE TABLE IF NOT EXISTS revenue (
    invoice_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) UNIQUE,
    amount_charged DECIMAL NOT NULL CHECK (amount_charged >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);