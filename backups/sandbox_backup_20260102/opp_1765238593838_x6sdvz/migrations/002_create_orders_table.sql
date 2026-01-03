CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    total NUMERIC CHECK (total >= 0), -- To ensure no negative order amounts are entered.
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT0TIMestamp,
    completed BOOLEAN NOT NULL DEFAULT FALSE
);