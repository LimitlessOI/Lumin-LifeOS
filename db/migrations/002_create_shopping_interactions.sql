```sql
CREATE TABLE shopping_interactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    interaction_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON shopping_interactions(user_id);
```