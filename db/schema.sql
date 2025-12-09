```sql
CREATE TABLE smart_city_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_metrics (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES smart_city_devices(id),
    metric_type VARCHAR(255),
    value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE privacy_consents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    consent_granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_predictions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    prediction JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```