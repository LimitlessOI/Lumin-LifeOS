CREATE TABLE edge_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    last_heartbeat TIMESTAMP
);

CREATE TABLE maintenance_records (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    issue_description TEXT,
    maintenance_date TIMESTAMP,
    status VARCHAR(50)
);

CREATE TABLE federated_learning_rounds (
    round_id SERIAL PRIMARY KEY,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    model_version VARCHAR(255)
);

CREATE TABLE digital_twin_scenarios (
    scenario_id SERIAL PRIMARY KEY,
    description TEXT,
    simulation_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);