```sql
CREATE TABLE customizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    scenario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_customizations_scenario_id ON customizations(scenario_id);
CREATE INDEX idx_customizations_value_jsonb ON customizations USING GIN (value);
```