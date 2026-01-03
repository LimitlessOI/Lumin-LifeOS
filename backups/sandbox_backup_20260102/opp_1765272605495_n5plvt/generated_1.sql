---FILE:migrations/001_create_metrics_table.sql---
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(id),
    metric_name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 4) DEFAULT 0.0000,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
---END FILE===