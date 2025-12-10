```sql
CREATE TABLE team_models (
    model_id SERIAL PRIMARY KEY,
    team_id INT NOT NULL,
    model_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```