CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    description VARCHAR(500),
    assigned_to_user_id INTEGER REFERENCES users(id),
    due_date DATE NOT NULL
);