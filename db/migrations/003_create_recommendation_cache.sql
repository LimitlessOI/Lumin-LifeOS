```sql
CREATE TABLE recommendation_cache (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    recommendations JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON recommendation_cache(user_id);
```