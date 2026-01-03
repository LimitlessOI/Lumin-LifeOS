CREATE TABLE IF NOT EXISTS snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id),
    performance_score DECIMAL NOT NULL CHECK (performance_score >= 0 AND score <= 100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);