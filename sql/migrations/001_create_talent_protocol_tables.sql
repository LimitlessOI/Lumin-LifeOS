```sql
CREATE TABLE talent_protocol_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE talent_tasks (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES talent_protocol_users(id),
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reputation_events (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES talent_protocol_users(id),
    event_type VARCHAR(100),
    score_change INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dispute_cases (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES talent_tasks(id),
    status VARCHAR(50),
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```