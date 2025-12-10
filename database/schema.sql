```sql
CREATE TABLE automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_tasks (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES automation_workflows(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_executions (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES automation_tasks(id),
    status VARCHAR(50) NOT NULL,
    result JSONB,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```