```sql
CREATE TABLE model_performance_logs (
  id SERIAL PRIMARY KEY,
  model_id INT REFERENCES ai_models(id),
  metric_type VARCHAR(50),
  metric_value FLOAT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ai_models(id)
);
```