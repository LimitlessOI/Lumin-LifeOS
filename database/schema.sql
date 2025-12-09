```sql
CREATE TABLE neural_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);

CREATE TABLE neural_patterns (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES neural_sessions(id),
    pattern_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_calibrations (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    calibration_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_commands (
    id SERIAL PRIMARY KEY,
    pattern_id INT REFERENCES neural_patterns(id),
    command VARCHAR(255),
    executed BOOLEAN DEFAULT FALSE
);
```