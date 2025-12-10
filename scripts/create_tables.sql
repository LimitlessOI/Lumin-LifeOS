```sql
CREATE TABLE deployment_history (
    id SERIAL PRIMARY KEY,
    repository_name VARCHAR(255) NOT NULL,
    deployment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    logs TEXT
);

CREATE TABLE pipeline_configs (
    id SERIAL PRIMARY KEY,
    repository_name VARCHAR(255) NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```