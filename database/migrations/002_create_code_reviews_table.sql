-- SYNOPSIS: SQL — 002_create_code_reviews_table.sql.
```sql
CREATE TABLE IF NOT EXISTS code_reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    repo_name VARCHAR(255) NOT NULL,
    pull_request_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);