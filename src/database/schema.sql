```sql
CREATE TABLE farm_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    type VARCHAR(255),
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    reading_value FLOAT NOT NULL,
    reading_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES farm_sensors(sensor_id)
);

CREATE TABLE environmental_credits (
    id SERIAL PRIMARY KEY,
    credit_type VARCHAR(255) NOT NULL,
    amount FLOAT NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(255) NOT NULL,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE yield_outcomes (
    id SERIAL PRIMARY KEY,
    outcome_description TEXT NOT NULL,
    yield_value FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```