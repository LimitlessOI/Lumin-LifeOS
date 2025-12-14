```sql
CREATE TABLE automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES automation_workflows(id),
    status VARCHAR(50),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    log TEXT
);

CREATE TABLE automation_collaborators (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES automation_workflows(id),
    user_id INT NOT NULL,
    role VARCHAR(50),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_versions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES automation_workflows(id),
    version_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changes TEXT
);
```