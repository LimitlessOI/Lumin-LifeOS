CREATE TABLE health_wearables (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  data JSONB NOT NULL
);

CREATE TABLE health_metrics (
  id SERIAL PRIMARY KEY,
  wearable_id INT REFERENCES health_wearables(id),
  metric_name VARCHAR(255) NOT NULL,
  metric_value FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

CREATE TABLE health_baselines (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  baseline_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_predictions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  prediction_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
  id SERIAL PRIMARY KEY,
  model_data BYTEA NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinician_access (
  id SERIAL PRIMARY KEY,
  clinician_id INT NOT NULL,
  user_id INT NOT NULL,
  access_level VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ehr_integrations (
  id SERIAL PRIMARY KEY,
  ehr_system VARCHAR(255) NOT NULL,
  integration_details JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);