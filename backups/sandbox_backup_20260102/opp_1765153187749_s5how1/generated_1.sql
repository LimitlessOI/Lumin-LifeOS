-- migrations/001_create_table.sql
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    description TEXT,
    priority INTEGER CHECK(priority >= 0 AND priority <= 5), -- assuming priorities range from 1 to 5 with an optional 'high' task as a special case.
    assigned_coder_id INT REFEREN0N coder(code) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')), -- standardized for the sake of this example.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (assigned_coder_id) REFERENCES coders(coder_id), -- Assuming a 'coders' table exists. 
    UNIQUE(description, assigned_coder_id, priority) -- to avoid duplicate tasks for the same coder and task description at once.
);