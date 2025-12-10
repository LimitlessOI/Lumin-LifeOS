```sql
-- Create nanoparticle_designs table
CREATE TABLE nanoparticle_designs (
    id SERIAL PRIMARY KEY,
    design_name VARCHAR(255) NOT NULL,
    material VARCHAR(255),
    size FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery_trials table
CREATE TABLE delivery_trials (
    id SERIAL PRIMARY KEY,
    design_id INTEGER REFERENCES nanoparticle_designs(id),
    trial_date TIMESTAMP,
    success BOOLEAN,
    notes TEXT
);

-- Create ml_optimization_models table
CREATE TABLE ml_optimization_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version VARCHAR(50),
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```