```sql
CREATE TABLE blockchain_produce (
  id SERIAL PRIMARY KEY,
  produce_id INTEGER,
  transaction_hash VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);