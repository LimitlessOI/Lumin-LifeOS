```sql
CREATE TABLE workspace_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL,
    session_data JSONB,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ
);

CREATE TABLE integration_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hardware_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    hardware_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```