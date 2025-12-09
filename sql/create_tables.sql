```sql
CREATE TABLE telepresence_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50)
);

CREATE TABLE avatar_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    avatar_data JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE telepresence_devices (
    device_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_type VARCHAR(100),
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```