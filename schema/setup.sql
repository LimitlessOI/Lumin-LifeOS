```sql
CREATE TABLE health_devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_type VARCHAR(50),
    device_id VARCHAR(100) UNIQUE,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL,
    metric_type VARCHAR(50),
    value NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES health_devices(id)
);

CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    prediction_type VARCHAR(50),
    prediction_value JSONB,
    confidence_level NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE intervention_plans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE phi_access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_by VARCHAR(100),
    access_reason VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```