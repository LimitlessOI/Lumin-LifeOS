CREATE TABLE ubi_users (
    user_id SERIAL PRIMARY KEY,
    eth_address VARCHAR(42) UNIQUE NOT NULL
);

CREATE TABLE ubi_distributions (
    id SERIAL PRIMARY KEY,
    eth_address VARCHAR(42) NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);