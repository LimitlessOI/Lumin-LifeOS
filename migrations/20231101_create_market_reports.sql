-- SYNOPSIS: Database migration — 20231101_create_market_reports.sql.
```sql
CREATE TABLE market_reports (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    model_id INTEGER REFERENCES ai_models(id),
    status VARCHAR(50) NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);