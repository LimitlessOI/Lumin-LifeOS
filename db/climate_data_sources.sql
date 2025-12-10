```sql
CREATE TABLE IF NOT EXISTS climate_data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255),
    last_accessed TIMESTAMP
);
```