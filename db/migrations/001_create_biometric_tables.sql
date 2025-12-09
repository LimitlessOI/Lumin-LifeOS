```sql
CREATE TABLE biometric_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    biometric_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE authentication_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_updates (
    id SERIAL PRIMARY KEY,
    model_update JSONB NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voice_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    voice_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```