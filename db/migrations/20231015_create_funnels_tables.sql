```sql
-- Migration script to create marketing_funnels and funnel_events tables

CREATE TABLE marketing_funnels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funnel_events (
    id SERIAL PRIMARY KEY,
    funnel_id INT NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funnel_id) REFERENCES marketing_funnels(id) ON DELETE CASCADE
);
```