CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    priority INTEGER CHECK (priority BETWEER 1 AND 5), -- Assuming a scale from low to high urgency/importance
    assigned_developer_id INT REFERENCES developers(developer_id) ON DELETE SET NULL,
    estimated_completion DATE NOT NULL,
    status VARCHAR CHECK (status IN ('pending', 'in progress', 'completed'))
);