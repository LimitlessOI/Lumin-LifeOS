```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_dependencies (
    task_id INT NOT NULL,
    dependency_id INT NOT NULL,
    PRIMARY KEY (task_id, dependency_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (dependency_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE task_automations (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL,
    automation_type VARCHAR(100),
    parameters JSONB,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```