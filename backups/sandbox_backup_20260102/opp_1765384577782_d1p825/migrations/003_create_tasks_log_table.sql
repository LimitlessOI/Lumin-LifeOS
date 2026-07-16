-- SYNOPSIS: SQL — 003_create_tasks_log_table.sql.
CREATE TABLE IF NOT EXISTS tasks_log (
    task_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);