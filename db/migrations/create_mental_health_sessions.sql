```sql
CREATE TABLE mental_health_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```