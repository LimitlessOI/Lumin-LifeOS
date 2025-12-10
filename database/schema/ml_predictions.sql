```sql
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES urban_projects(id),
    prediction_type VARCHAR(50),
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```