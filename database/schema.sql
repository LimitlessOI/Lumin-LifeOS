CREATE TABLE funnel_configs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  config_data JSONB
);

CREATE TABLE funnel_metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  value NUMERIC
);

CREATE TABLE ai_model_configs (
  id SERIAL PRIMARY KEY,
  config_data JSONB
);

CREATE TABLE dashboard_widgets (
  id SERIAL PRIMARY KEY,
  widget_type VARCHAR(255),
  config_data JSONB
);

CREATE TABLE performance_alerts (
  id SERIAL PRIMARY KEY,
  message VARCHAR(255),
  severity INT
);