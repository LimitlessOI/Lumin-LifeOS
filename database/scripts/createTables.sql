```sql
CREATE TABLE market_analyses (
    id SERIAL PRIMARY KEY,
    analysis_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis_metrics (
    id SERIAL PRIMARY KEY,
    market_analysis_id INT REFERENCES market_analyses(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(10, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```