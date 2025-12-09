```sql
CREATE TABLE climate_simulations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE climate_data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP
);

CREATE TABLE quantum_algorithm_registry (
    id SERIAL PRIMARY KEY,
    algorithm_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```