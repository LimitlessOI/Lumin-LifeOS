```sql
CREATE TABLE code_reviews (
  id SERIAL PRIMARY KEY,
  repository_url VARCHAR(255) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```