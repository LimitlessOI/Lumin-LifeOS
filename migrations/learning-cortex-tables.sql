CREATE TABLE learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES learning_profiles(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE micro_projects (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES learning_sessions(id),
    project_details JSONB,
    completed_at TIMESTAMP
);

CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    progress_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blind_spot_detections (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    detection_data JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);