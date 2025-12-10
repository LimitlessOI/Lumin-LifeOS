```sql
CREATE TABLE user_behavior_patterns (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    pattern_data JSONB NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```