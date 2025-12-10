```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  learning_style VARCHAR(50)
);

CREATE TABLE interactions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```