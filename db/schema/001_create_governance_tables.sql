```sql
CREATE TABLE municipality_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    population INTEGER,
    economic_indicators JSONB,
    social_indicators JSONB,
    environmental_indicators JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_simulations (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(255) NOT NULL,
    municipality_id INTEGER REFERENCES municipality_data(id),
    input_parameters JSONB NOT NULL,
    predicted_outcomes JSONB,
    shap_explanation JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ethical_boundary_logs (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES policy_simulations(id),
    boundary_violation_type VARCHAR(255) NOT NULL,
    details JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```