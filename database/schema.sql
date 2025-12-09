```sql
-- Lending Table
CREATE TABLE lending (
    id SERIAL PRIMARY KEY,
    borrower_id INT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL,
    duration INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance Table
CREATE TABLE insurance (
    id SERIAL PRIMARY KEY,
    policy_holder_id INT NOT NULL,
    coverage_amount NUMERIC(10, 2) NOT NULL,
    premium NUMERIC(10, 2) NOT NULL,
    policy_term INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```