```sql
CREATE TABLE amvf_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plant_growth_data (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES amvf_modules(id),
    growth_metric DECIMAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE swarm_robotics (
    id SERIAL PRIMARY KEY,
    task_description TEXT,
    status VARCHAR(50),
    assigned_module_id INTEGER REFERENCES amvf_modules(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_metrics (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES amvf_modules(id),
    energy_consumed DECIMAL,
    energy_generated DECIMAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_quality (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES amvf_modules(id),
    quality_score DECIMAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```