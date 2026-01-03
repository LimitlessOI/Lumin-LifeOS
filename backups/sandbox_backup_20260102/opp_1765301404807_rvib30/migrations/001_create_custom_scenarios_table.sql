BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS custom_scenarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    revenue_projection NUMERIC(8, 2),
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- Assuming there is an 'employees' table and a foreign key relationship.
    status VARCHAR CHECK (status IN ('pending', 'active', 'completed')) NOT NULL DEFAULT 'pending'
);
CREATE UNIQUE INDEX idx_custom_scenario_name ON custom_scenarios(name); -- Ensures uniqueness of scenario names for tracking purposes within Lightweight Assistant.
COMMIT;