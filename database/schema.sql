```sql
CREATE TABLE energy_grid_nodes (
    id SERIAL PRIMARY KEY,
    node_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    capacity FLOAT
);

CREATE TABLE energy_metrics (
    id SERIAL PRIMARY KEY,
    node_id INT REFERENCES energy_grid_nodes(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    energy_consumed FLOAT,
    energy_generated FLOAT
);

CREATE TABLE predictive_alerts (
    id SERIAL PRIMARY KEY,
    node_id INT REFERENCES energy_grid_nodes(id),
    alert_type VARCHAR(255),
    alert_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_flow_logs (
    id SERIAL PRIMARY KEY,
    node_id INT REFERENCES energy_grid_nodes(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    energy_flow_direction VARCHAR(50),
    energy_flow_amount FLOAT
);
```