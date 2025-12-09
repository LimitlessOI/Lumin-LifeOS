CREATE TABLE ar_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_sessions (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES ar_devices(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE competency_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    competency_data JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_paths (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    path_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);