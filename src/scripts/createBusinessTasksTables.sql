```sql
-- Create table for business tasks
CREATE TABLE IF NOT EXISTS business_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES business_tasks(id) ON DELETE CASCADE,
    dependency_id INT REFERENCES business_tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id, dependency_id)
);

-- Index for quick lookup
CREATE INDEX idx_task_id ON task_dependencies(task_id);
CREATE INDEX idx_dependency_id ON task_dependencies(dependency_id);
```