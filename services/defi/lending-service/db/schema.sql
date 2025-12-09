```sql
CREATE TABLE lending_offers (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,
    transaction_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```