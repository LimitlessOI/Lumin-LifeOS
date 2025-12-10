```sql
CREATE TABLE dashboard_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    layout JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    widget_type VARCHAR(255) NOT NULL,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE process_metrics_cache (
    id SERIAL PRIMARY KEY,
    process_id INT NOT NULL,
    metrics JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```