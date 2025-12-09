```sql
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspace_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id INT REFERENCES workspaces(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE spatial_profiles (
    id SERIAL PRIMARY KEY,
    workspace_id INT REFERENCES workspaces(id),
    profile_data JSONB
);

CREATE TABLE hardware_compatibility (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255),
    compatibility_data JSONB
);
```