```sql
CREATE TABLE crop_growth_cycles (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES farm_modules(id),
  crop_type VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  yield FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);