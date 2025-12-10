```sql
CREATE TABLE offline_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);