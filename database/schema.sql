```sql
CREATE TABLE vr_workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL,
    host_id INT NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES vr_workspaces(id)
);

CREATE TABLE vr_assets (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL,
    asset_data JSONB NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES vr_workspaces(id)
);

CREATE TABLE ai_avatars (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    avatar_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```