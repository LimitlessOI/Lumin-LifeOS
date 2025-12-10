```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    repository_url VARCHAR(255) NOT NULL,
    branch_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON code_reviews(user_id);
```