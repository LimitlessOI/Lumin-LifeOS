```sql
CREATE TABLE climate_indicators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_actions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    effective_date DATE
);

CREATE TABLE simulation_runs (
    id SERIAL PRIMARY KEY,
    policy_action_id INT REFERENCES policy_actions(id),
    start_date DATE,
    end_date DATE,
    result JSONB
);

CREATE TABLE audit_trails (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255),
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);
```