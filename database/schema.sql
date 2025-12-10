```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    code_snippet TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (review_id) REFERENCES code_reviews(id) ON DELETE CASCADE
);
```