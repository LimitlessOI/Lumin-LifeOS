-- SYNOPSIS: Database migration — 20231101_create_code_reviews_table.sql.
```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER NOT NULL,
    commit_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```