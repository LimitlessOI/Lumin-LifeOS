CREATE TABLE crispr_designs (
  id SERIAL PRIMARY KEY,
  variety_id INTEGER REFERENCES biocrop_varieties(id),
  design_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);