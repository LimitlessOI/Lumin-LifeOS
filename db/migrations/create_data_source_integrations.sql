```sql
CREATE TABLE data_source_integrations (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255),
    connection_status VARCHAR(50),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```