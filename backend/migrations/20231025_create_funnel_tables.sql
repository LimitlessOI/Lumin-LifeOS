```sql
CREATE TABLE funnel_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funnel_steps (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES funnel_sessions(id),
    step_name VARCHAR(255) NOT NULL,
    step_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_funnel_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    current_step VARCHAR(255),
    progress_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```