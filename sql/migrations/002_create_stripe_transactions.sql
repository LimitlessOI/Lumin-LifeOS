```sql
CREATE TABLE stripe_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) NOT NULL,
  customer_id INT REFERENCES stripe_customers(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```