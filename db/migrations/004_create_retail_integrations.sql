```sql
CREATE TABLE retail_integrations (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```