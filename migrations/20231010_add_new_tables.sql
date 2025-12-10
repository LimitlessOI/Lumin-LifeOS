```sql
CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emotional_metrics (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES learning_sessions(id),
    metrics JSONB,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_adaptations (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES learning_sessions(id),
    adaptation_details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teacher_dashboards (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL,
    dashboard_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```