```sql
CREATE TABLE ar_learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_content_library (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaboration_sessions (
    id SERIAL PRIMARY KEY,
    session_id INT,
    participant_ids INT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_analytics (
    id SERIAL PRIMARY KEY,
    user_id INT,
    session_id INT,
    analytics_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```