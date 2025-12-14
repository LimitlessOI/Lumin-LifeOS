```sql
CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id),
    security_score FLOAT,
    performance_score FLOAT,
    style_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);