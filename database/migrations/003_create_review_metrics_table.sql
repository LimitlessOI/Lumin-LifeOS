```sql
CREATE TABLE IF NOT EXISTS review_metrics (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);