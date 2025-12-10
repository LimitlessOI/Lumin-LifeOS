```sql
CREATE TABLE chatbot_configs (
  id SERIAL PRIMARY KEY,
  config JSONB NOT NULL
);

CREATE TABLE chatbot_analytics (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

CREATE TABLE system_status_logs (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```