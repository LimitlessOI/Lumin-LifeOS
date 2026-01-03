CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFEREN0NCES customers(id),
    product_sku VARCHAR(255),
    amount DECIMAL(10, 2) CHECK (amount > 0),
    currency CHAR(3),
    status TEXT NOT NULL DEFAULT 'pending', -- Assume simplified for demo purposes: {'success', 'failure'}
    stripe_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);