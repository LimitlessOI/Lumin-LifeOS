```sql
CREATE TABLE nanoparticle_formulations (
    id SERIAL PRIMARY KEY,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_runs (
    id SERIAL PRIMARY KEY,
    formulation_id INT REFERENCES nanoparticle_formulations(id),
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL
);

CREATE TABLE trial_data (
    id SERIAL PRIMARY KEY,
    run_id INT REFERENCES simulation_runs(id),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```