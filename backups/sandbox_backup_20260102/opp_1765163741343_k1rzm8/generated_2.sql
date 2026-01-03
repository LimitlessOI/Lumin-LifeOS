---FILE:migrations/2019_10_30_143837_create_projects_table.sql---
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) CHECK (status IN ('pending', 'in progress', 'completed'))
);