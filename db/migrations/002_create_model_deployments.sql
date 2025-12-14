```sql
CREATE TABLE model_deployments (
  id SERIAL PRIMARY KEY,
  model_id INT REFERENCES ai_models(id),
  deployment_status VARCHAR(50),
  deployed_at TIMESTAMP,
  environment VARCHAR(50),
  FOREIGN KEY (model_id) REFERENCES ai_models(id)
);
```