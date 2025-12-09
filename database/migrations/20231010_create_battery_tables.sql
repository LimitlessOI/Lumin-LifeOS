CREATE TABLE battery_units (
  id SERIAL PRIMARY KEY,
  model VARCHAR(255) NOT NULL,
  capacity INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_storage_sessions (
  id SERIAL PRIMARY KEY,
  battery_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  energy_stored DECIMAL(10, 2),
  FOREIGN KEY (battery_id) REFERENCES battery_units(id)
);

CREATE TABLE manufacturing_processes (
  id SERIAL PRIMARY KEY,
  process_name VARCHAR(255) NOT NULL,
  initial_cost DECIMAL(10, 2) NOT NULL,
  optimized_yield DECIMAL(10, 2),
  process_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_integrations (
  id SERIAL PRIMARY KEY,
  integration_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  last_sync TIMESTAMP
);