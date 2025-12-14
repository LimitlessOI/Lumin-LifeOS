```sql
CREATE TABLE org_twin_simulations (
    simulation_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    simulation_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```