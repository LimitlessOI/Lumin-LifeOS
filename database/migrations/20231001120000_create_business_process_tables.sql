```sql
CREATE TABLE business_processes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE process_executions (
    id SERIAL PRIMARY KEY,
    process_id INT REFERENCES business_processes(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE process_metrics (
    id SERIAL PRIMARY KEY,
    execution_id INT REFERENCES process_executions(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```