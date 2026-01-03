BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    amount NUMERIC CHECK (amount >= 0) DEFAULT 0,
    status ENUM('completed', 'failed') DEFAULT 'pending'
);
COMMIT TRANSA0;