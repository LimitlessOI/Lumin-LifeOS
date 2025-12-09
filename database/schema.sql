```sql
CREATE TABLE therapy_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255),
    age INT,
    gender VARCHAR(50),
    primary_condition VARCHAR(255),
    therapy_goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE therapy_sessions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES therapy_profiles(id),
    session_date TIMESTAMP NOT NULL,
    session_notes TEXT,
    intervention_applied BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biometric_data (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES therapy_profiles(id),
    data_source VARCHAR(255),
    data JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE intervention_logs (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES therapy_sessions(id),
    intervention_type VARCHAR(255),
    outcome VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rl_feedback (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES therapy_sessions(id),
    feedback JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```