```sql
CREATE TABLE market_data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_endpoint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    source_id INT REFERENCES market_data_sources(id),
    data JSONB NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON market_data (source_id);
CREATE INDEX ON market_data USING GIN (data);
CREATE INDEX ON market_data (recorded_at);

-- Example partitioning by year
CREATE TABLE market_data_2023 PARTITION OF market_data
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
-- Add more partitions as needed
```