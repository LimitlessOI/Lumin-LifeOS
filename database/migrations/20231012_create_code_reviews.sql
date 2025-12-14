```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_comments (
    id SERIAL PRIMARY KEY,
    code_review_id INT REFERENCES code_reviews(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    code_review_id INT REFERENCES code_reviews(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```