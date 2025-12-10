```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflows(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE third_party_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credentials JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```