CREATE TABLE ubi_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    biometric_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ubi_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES ubi_users(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contribution_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES ubi_users(id),
    metric_type VARCHAR(50) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE merchant_taxes (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES ubi_transactions(id),
    tax_amount NUMERIC(10, 2) NOT NULL,
    tax_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--