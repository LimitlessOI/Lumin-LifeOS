```sql
-- Create table for workspace sessions
CREATE TABLE workspace_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create table for user preferences
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(50),
    preference_value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create table for spatial maps
CREATE TABLE spatial_maps (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    map_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```