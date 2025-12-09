CREATE TABLE neural_sync_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_sync_environments (
    id SERIAL PRIMARY KEY,
    environment_name VARCHAR(255),
    environment_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_sync_wearables (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255),
    user_id INT NOT NULL,
    status VARCHAR(50),
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_sync_licenses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    license_key VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50),
    valid_until DATE
);