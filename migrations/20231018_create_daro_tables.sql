```sql
CREATE TABLE daro_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(255) UNIQUE NOT NULL,
    total_resources INT NOT NULL,
    available_resources INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE optimization_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    node_id VARCHAR(255) REFERENCES daro_nodes(node_id),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reputation_events (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) REFERENCES daro_nodes(node_id),
    event_type VARCHAR(50),
    score_change INT,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```