```sql
CREATE TABLE urban_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    parameters BYTEA NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE impact_tokens (
    id SERIAL PRIMARY KEY,
    token_id VARCHAR(255) UNIQUE NOT NULL,
    owner VARCHAR(255) NOT NULL,
    impact_score FLOAT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_scenarios (
    id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resilience_scores (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    score FLOAT NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```