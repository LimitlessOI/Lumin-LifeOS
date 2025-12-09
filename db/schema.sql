```sql
CREATE TABLE exosuit_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biomechanical_metrics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES exosuit_sessions(id),
    metric_name VARCHAR(100),
    value FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rehabilitation_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suit_configurations (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES exosuit_sessions(id),
    configuration_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```