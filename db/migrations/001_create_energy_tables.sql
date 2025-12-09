CREATE TABLE energy_grid_nodes (
  id SERIAL PRIMARY KEY,
  node_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_forecasts (
  id SERIAL PRIMARY KEY,
  node_id VARCHAR(255) REFERENCES energy_grid_nodes(node_id),
  forecasted_value NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_alerts (
  id SERIAL PRIMARY KEY,
  node_id VARCHAR(255) REFERENCES energy_grid_nodes(node_id),
  alert_message TEXT,
  alert_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  node_id VARCHAR(255) REFERENCES energy_grid_nodes(node_id),
  transaction_value NUMERIC,
  transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);