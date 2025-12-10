```sql
-- Create table for kanban boards
CREATE TABLE kanban_boards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for kanban columns
CREATE TABLE kanban_columns (
    id SERIAL PRIMARY KEY,
    board_id INT REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for kanban tasks
CREATE TABLE kanban_tasks (
    id SERIAL PRIMARY KEY,
    column_id INT REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for task comments
CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for task attachments
CREATE TABLE task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);