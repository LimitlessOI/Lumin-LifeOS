```sql
-- Create 'neuralgrow_pods' table
CREATE TABLE neuralgrow_pods (
    id SERIAL PRIMARY KEY,
    pod_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create 'pod_metrics' table
CREATE TABLE pod_metrics (
    id SERIAL PRIMARY KEY,
    pod_id INTEGER NOT NULL,
    metric_type VARCHAR(255) NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES neuralgrow_pods(id) ON DELETE CASCADE
);

-- Create 'food_credits' table
CREATE TABLE food_credits (
    id SERIAL PRIMARY KEY,
    pod_id INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES neuralgrow_pods(id) ON DELETE CASCADE
);

-- Create 'ai_optimizations' table
CREATE TABLE ai_optimizations (
    id SERIAL PRIMARY KEY,
    pod_id INTEGER NOT NULL,
    optimization_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES neuralgrow_pods(id) ON DELETE CASCADE
);
```