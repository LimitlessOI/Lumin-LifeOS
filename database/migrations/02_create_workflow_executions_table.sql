```sql
CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflows(id),
    status VARCHAR(50),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
```