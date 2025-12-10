```sql
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sensor_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL
);

CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sensor_id VARCHAR(255) NOT NULL,
    prediction JSONB NOT NULL
);

CREATE TABLE citizen_reports (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    report_data JSONB NOT NULL
);

CREATE INDEX idx_sensor_data_timestamp ON sensor_data (timestamp);
CREATE INDEX idx_predictions_timestamp ON predictions (timestamp);
CREATE INDEX idx_citizen_reports_timestamp ON citizen_reports (timestamp);
```