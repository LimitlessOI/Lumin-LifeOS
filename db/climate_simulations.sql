```sql
CREATE TABLE IF NOT EXISTS climate_simulations (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES climate_policies(id),
    agent_id INT REFERENCES climate_agents(id),
    result JSONB,
    simulation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```