```sql
CREATE TABLE IF NOT EXISTS bci_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neural_patterns (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES bci_devices(id),
    pattern_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bci_sessions (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES bci_devices(id),
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    session_data BYTEA
);

CREATE TABLE IF NOT EXISTS bci_calibration_history (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES bci_sessions(id),
    calibration_data BYTEA,
    calibrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```