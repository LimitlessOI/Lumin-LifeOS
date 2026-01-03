BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    amount DECIMAL(10, 2) CHECK (amount >= 0),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50), -- 'pending', 'completed', or 'failed'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENTCTIMERDEFAULT AND 
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE
);
CREATE INDEX idx_transactions_amount ON transactions(amount DESC); -- For efficient querying of largest/smallest amounts.
COMMIT;