```sql
CREATE TABLE predictive_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_dashboards (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    dashboard_name VARCHAR(255) NOT NULL,
    layout JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50),
    connection_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictive_queries (
    id SERIAL PRIMARY KEY,
    query_name VARCHAR(255) NOT NULL,
    query_description TEXT,
    model_id INT REFERENCES predictive_models(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anomaly_alerts (
    id SERIAL PRIMARY KEY,
    alert_name VARCHAR(255) NOT NULL,
    alert_description TEXT,
    query_id INT REFERENCES predictive_queries(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenario_simulations (
    id SERIAL PRIMARY KEY,
    simulation_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```