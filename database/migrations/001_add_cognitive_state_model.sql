```sql
-- Add table for cognitive state models
CREATE TABLE cognitive_states (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  state VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```