```sql
CREATE TABLE resource_usage (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER REFERENCES crop_growth_cycles(id),
  water_usage FLOAT,
  nutrient_usage FLOAT,
  energy_usage FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);