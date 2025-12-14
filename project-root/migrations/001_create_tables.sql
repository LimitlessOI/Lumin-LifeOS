```sql
CREATE TABLE jest_config_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_config_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  preferences JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```