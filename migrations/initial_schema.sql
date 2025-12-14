```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL
);

CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  integration_id INTEGER REFERENCES integrations(id),
  actions JSONB NOT NULL
);

CREATE TABLE execution_logs (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  details TEXT
);