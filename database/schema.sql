```sql
CREATE TABLE xr_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  session_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE phygital_sync (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES xr_sessions(id),
  sync_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE xr_analytics (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES xr_sessions(id),
  analytics_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_personalization_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  profile_data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```