```sql
CREATE TABLE farming_pods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    pod_id INT NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value NUMERIC NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES farming_pods(id) ON DELETE CASCADE
);

CREATE INDEX sensor_data_pod_id_index ON sensor_data(pod_id);
CREATE INDEX sensor_data_recorded_at_index ON sensor_data(recorded_at);