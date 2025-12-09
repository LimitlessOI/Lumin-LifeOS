```sql
-- Workspace table
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace sessions table
CREATE TABLE workspace_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id INT REFERENCES workspaces(id),
    user_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Spatial objects table
CREATE TABLE spatial_objects (
    id SERIAL PRIMARY KEY,
    workspace_id INT REFERENCES workspaces(id),
    type VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mode transitions table
CREATE TABLE mode_transitions (
    id SERIAL PRIMARY KEY,
    workspace_id INT REFERENCES workspaces(id),
    from_mode VARCHAR(50) NOT NULL,
    to_mode VARCHAR(50) NOT NULL,
    transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```