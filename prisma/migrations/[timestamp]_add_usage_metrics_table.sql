```sql
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_id ON usage_metrics(user_id);
CREATE INDEX idx_action ON usage_metrics(action);
CREATE INDEX idx_timestamp ON usage_metrics(timestamp);
```