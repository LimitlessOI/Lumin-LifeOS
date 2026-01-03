---FILE:migrations/2019_10_30_144058_create_automation_solutions_table.sql---
CREATE TABLE IF NOT EXISTS automation_solutions (
    solution_id SERIAL PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL,
    complexity INTEGER CHECK (complexity BETWEEN 1 AND 3), -- Assuming a scale for simplicity. Adjust as needed.
    cost_estimate NUMERIC(10,2) CHECK (cost_estimate > 0)
);