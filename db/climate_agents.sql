```sql
CREATE TABLE IF NOT EXISTS climate_agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    configuration JSONB,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```