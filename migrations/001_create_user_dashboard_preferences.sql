```sql
CREATE TABLE user_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
);
CREATE INDEX idx_user_id ON user_dashboard_preferences(user_id);
```