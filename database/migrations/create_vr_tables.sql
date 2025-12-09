```sql
CREATE TABLE vr_environments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_avatars (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    avatar_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_meetings (
    id SERIAL PRIMARY KEY,
    environment_id INT NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES vr_environments(id)
);

CREATE TABLE vr_integrations (
    id SERIAL PRIMARY KEY,
    integration_type VARCHAR(50) NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```