CREATE TABLE IF NOT EXISTS roi_snapshots (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, -- Link to the specific task
    date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    roi_data JSONB NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL -- Handle orphaned data if task is deleted.
);