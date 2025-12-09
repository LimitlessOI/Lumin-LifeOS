CREATE TABLE bci_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bci_metrics (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES bci_sessions(id),
    metric_type VARCHAR(50),
    metric_value DOUBLE PRECISION,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bci_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bci_feedback_logs (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES bci_sessions(id),
    feedback TEXT,
    feedback_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--