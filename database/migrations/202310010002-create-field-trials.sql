CREATE TABLE field_trials (
  id SERIAL PRIMARY KEY,
  variety_id INTEGER REFERENCES biocrop_varieties(id),
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50),
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);