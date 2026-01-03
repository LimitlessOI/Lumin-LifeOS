-- File: migrations/003_create_transactions_table.sql
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    payment_details JSONB, -- Payment details captured securely by Stripe API integration and stored post-capture.
    stripe_charge_id VARCHAR(255),
    is_test BOOLEAN DEFAULT FALSE, -- Indicates if the transaction was from a test campaign/offer or real sale event.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);