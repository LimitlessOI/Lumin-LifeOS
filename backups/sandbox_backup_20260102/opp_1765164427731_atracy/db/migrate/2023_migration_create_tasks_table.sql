BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,
    task_name VARCHAR(191),
    description TEXT,
    status ENUM('pending', 'in-progress', 'completed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMEZOND,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) -- This is an example of creating a composite foreign key. In reality, we might just want to reference the 'tasks' table directly from 'businesses'. Adjust as necessary for your schema design choices and business logic needs.
);
COMMIT;