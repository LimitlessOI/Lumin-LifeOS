```sql
CREATE TABLE health_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    profile_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES health_profiles(id),
    metric_type VARCHAR(50),
    value FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ehr_sync_logs (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES health_profiles(id),
    sync_status VARCHAR(20),
    sync_details JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    version VARCHAR(20),
    model_data BYTEA,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinician_alerts (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES health_profiles(id),
    alert_type VARCHAR(50),
    alert_details JSONB,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_integrations (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES health_profiles(id),
    device_type VARCHAR(50),
    integration_data JSONB,
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```