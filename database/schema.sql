CREATE TABLE health_metrics (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ppg_data JSONB,
  ecg_data JSONB,
  temperature_data JSONB,
  motion_data JSONB
);

CREATE TABLE health_baselines (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  baseline_data JSONB
);

CREATE TABLE predictive_alerts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  alert_type VARCHAR(50),
  alert_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clinician_assignments (
  id SERIAL PRIMARY KEY,
  clinician_id INT NOT NULL,
  user_id INT NOT NULL,
  assignment_details JSONB
);

CREATE TABLE federated_learning_models (
  id SERIAL PRIMARY KEY,
  model_data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);