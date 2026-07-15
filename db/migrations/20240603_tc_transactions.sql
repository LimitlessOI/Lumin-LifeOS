-- SYNOPSIS: Database migration — 20240603_tc_transactions.sql.
CREATE TABLE IF NOT EXISTS tc_transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    service_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);