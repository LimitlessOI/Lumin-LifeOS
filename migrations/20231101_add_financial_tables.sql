```sql
-- SQL Migration Script for Adding Financial Tables

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_transactions ON transactions(user_id);
CREATE INDEX idx_transaction_category ON transactions(category);

-- Additional tables and relationships can be added here as needed
```