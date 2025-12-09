CREATE TABLE health_sentinels (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50),
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biometric_streams (
    id SERIAL PRIMARY KEY,
    sentinel_id INT REFERENCES health_sentinels(id),
    type VARCHAR(50),
    value FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_alerts (
    id SERIAL PRIMARY KEY,
    sentinel_id INT REFERENCES health_sentinels(id),
    alert_type VARCHAR(50),
    message TEXT,
    severity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_data BYTEA,
    version INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);