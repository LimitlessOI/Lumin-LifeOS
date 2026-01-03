CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2),
    status VARCHAR(50),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW())
);