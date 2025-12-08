CREATE TABLE pait_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pait_scenarios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES pait_users(id),
    scenario_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pait_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES pait_users(id),
    prediction_result JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pait_biometric_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES pait_users(id),
    biometric_data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);