---FILE:migrations/002_create_processes_table.sql---
CREATE TABLE IF NOT EXISTS processes (
    id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(id),
    process_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    created_by INT REFERENCES employees(id) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
---END FILE===