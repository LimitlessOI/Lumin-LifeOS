```sql
CREATE TABLE intervention_suggestions (
    suggestion_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    suggestion_data JSONB,
    effectiveness_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```