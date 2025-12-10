```sql
CREATE TABLE review_metrics (
  id SERIAL PRIMARY KEY,
  code_review_id INT REFERENCES code_reviews(id),
  metric_name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```