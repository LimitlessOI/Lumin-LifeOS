```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  stripe_payment_intent_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```