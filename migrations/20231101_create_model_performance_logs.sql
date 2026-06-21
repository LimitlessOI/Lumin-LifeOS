-- SYNOPSIS: Database migration — 20231101_create_model_performance_logs.sql.
```sql
CREATE TABLE model_performance_logs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ai_models(id),
    performance_metrics JSONB,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);