CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) CHECK (status IN ('open', 'in-progress', 'completed'))
);