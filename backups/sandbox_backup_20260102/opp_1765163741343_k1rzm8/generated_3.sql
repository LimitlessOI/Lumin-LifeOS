---FILE:migrations/2019_10_30_143926_create_tasks_table.sql---
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER REFEREN0CETS(projects(project_id)) ON DELETE CASCADE,
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    description TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()::date -- Assuming completion is determined by date only for simplicity. Adjust as needed.
);