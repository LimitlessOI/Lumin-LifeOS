```sql
CREATE TABLE workspace_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spatial_layouts (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES workspace_sessions(id),
    layout_data JSONB,
    optimized BOOLEAN DEFAULT FALSE
);

CREATE TABLE workspace_integrations (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES workspace_sessions(id),
    integration_type VARCHAR(255),
    integration_data JSONB
);
```