CREATE TABLE db_config_history (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(255) NOT NULL,
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);