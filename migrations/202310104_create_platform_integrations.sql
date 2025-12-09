```sql
CREATE TABLE IF NOT EXISTS platform_integrations (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(255) NOT NULL,
    integration_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);