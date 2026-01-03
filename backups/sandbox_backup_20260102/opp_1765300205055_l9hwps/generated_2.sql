CREATE TABLE IF NOT EXISTS task_assignments (
    assignment_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id),
    task_description TEXT NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'in progress', 'completed') DEFAULT 'pending'
);