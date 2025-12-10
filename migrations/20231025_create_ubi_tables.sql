```sql
CREATE TABLE ubi_users (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) UNIQUE NOT NULL,
    identity_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ubi_payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES ubi_users(id),
    amount DECIMAL(18, 8) NOT NULL,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ubi_eligibility_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```