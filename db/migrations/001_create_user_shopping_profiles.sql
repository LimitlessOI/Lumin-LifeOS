```sql
CREATE TABLE user_shopping_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON user_shopping_profiles(user_id);
```