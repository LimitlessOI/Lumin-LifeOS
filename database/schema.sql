```sql
CREATE TABLE climate_data_streams (
    id SERIAL PRIMARY KEY,
    stream_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE climate_metrics (
    id SERIAL PRIMARY KEY,
    stream_id INT REFERENCES climate_data_streams(id),
    metric_name VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_recommendations (
    id SERIAL PRIMARY KEY,
    recommendation_text TEXT NOT NULL,
    effectiveness_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_results (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES policy_recommendations(id),
    result_data JSON NOT NULL,
    simulation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```