```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    repository VARCHAR(255) NOT NULL,
    branch VARCHAR(255),
    pr_number INT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);