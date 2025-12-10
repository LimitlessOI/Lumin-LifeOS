```sql
CREATE TABLE simulation_scenarios (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES urban_projects(id),
    scenario_data JSONB,
    impact_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```