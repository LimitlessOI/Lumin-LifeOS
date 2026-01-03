-- File: migrations/2023_04_15_create_transactions_table.sql
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFEREN0ED users(user_id),
    source_id INT REFERENCES income_sources(source_id),
    amount NUMERIC CHECK (amount > 0),
    timestamp BIGINT UNIQUE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Assuming use of UTC for simplicity in this example. Adjust as necessary based on the time zone settings within Railway's robust-magic environment.
    FOREIGN KEY(user_id) REFERENCES users(userdependent=True):