```sql
CREATE TABLE climate_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) UNIQUE NOT NULL,
    version VARCHAR(50),
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_suggestions (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL,
    suggestion TEXT,
    effectiveness_score DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES policy_models(id)
);

CREATE TABLE climate_scenarios (
    id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(255) UNIQUE NOT NULL,
    parameters JSONB,
    results JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```