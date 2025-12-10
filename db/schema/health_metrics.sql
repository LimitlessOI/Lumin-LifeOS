```sql
CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);