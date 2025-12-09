CREATE TABLE vr_environments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_sessions (
    id SERIAL PRIMARY KEY,
    environment_id INT REFERENCES vr_environments(id),
    user_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);

CREATE TABLE avatar_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    avatar_data JSONB NOT NULL
);

CREATE TABLE collaboration_artifacts (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES vr_sessions(id),
    artifact_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);