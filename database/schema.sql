```sql
-- Table for storing individual sessions of the empathy earpiece
CREATE TABLE empathy_earpiece_sessions (
    session_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES empathy_device_registry(device_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Table for storing empathy insights derived from device sessions
CREATE TABLE empathy_insights (
    insight_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    insight_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES empathy_earpiece_sessions(session_id)
);

-- Table for registering devices
CREATE TABLE empathy_device_registry (
    device_id SERIAL PRIMARY KEY,
    device_serial VARCHAR(50) UNIQUE NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```