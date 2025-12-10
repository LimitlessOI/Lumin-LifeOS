```sql
CREATE TABLE robotic_operations (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(255),
  status VARCHAR(50),
  module_id INTEGER REFERENCES farm_modules(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);