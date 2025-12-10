```sql
CREATE TABLE IF NOT EXISTS business_processes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_executions (
    id SERIAL PRIMARY KEY,
    process_id INTEGER REFERENCES business_processes(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_triggers (
    id SERIAL PRIMARY KEY,
    process_id INTEGER REFERENCES business_processes(id),
    trigger_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```