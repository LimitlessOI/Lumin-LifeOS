```sql
CREATE TABLE vr_therapy_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE federated_learning_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_integrations (
    integration_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_name VARCHAR(100),
    last_sync TIMESTAMP
);

CREATE TABLE clinician_portal (
    clinician_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    contact_info JSONB
);
```