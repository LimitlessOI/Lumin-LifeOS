```sql
CREATE TABLE edge_nodes (
    id SERIAL PRIMARY KEY,
    node_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    last_heartbeat TIMESTAMP
);

CREATE TABLE maintenance_predictions (
    id SERIAL PRIMARY KEY,
    node_id INT REFERENCES edge_nodes(id),
    prediction_time TIMESTAMP NOT NULL,
    predicted_issue VARCHAR(255),
    confidence_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE technician_feedback (
    id SERIAL PRIMARY KEY,
    prediction_id INT REFERENCES maintenance_predictions(id),
    technician_id INT,
    feedback_text TEXT,
    feedback_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_rounds (
    id SERIAL PRIMARY KEY,
    round_number INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    model_version VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_records_chain (
    id SERIAL PRIMARY KEY,
    record_hash CHAR(64),
    previous_hash CHAR(64),
    data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    technician_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```