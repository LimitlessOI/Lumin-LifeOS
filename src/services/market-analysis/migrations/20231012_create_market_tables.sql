```sql
CREATE TABLE market_data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_datasets (
    id SERIAL PRIMARY KEY,
    source_id INT REFERENCES market_data_sources(id),
    data JSONB NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_analysis_results (
    id SERIAL PRIMARY KEY,
    dataset_id INT REFERENCES market_datasets(id),
    analysis JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_insights (
    id SERIAL PRIMARY KEY,
    result_id INT REFERENCES ai_analysis_results(id),
    insight TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```