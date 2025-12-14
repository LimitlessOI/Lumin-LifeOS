```sql
CREATE TABLE ai_funnels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    metrics_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_funnels_name ON ai_funnels(name);
CREATE INDEX idx_ai_funnels_created_at ON ai_funnels(created_at);
```