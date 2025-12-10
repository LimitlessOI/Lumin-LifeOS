```sql
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_versions (
  id SERIAL PRIMARY KEY,
  workflow_id INT REFERENCES workflows(id),
  version INT NOT NULL,
  definition JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, version)
);

CREATE TABLE workflow_executions (
  id SERIAL PRIMARY KEY,
  workflow_id INT REFERENCES workflows(id),
  version INT,
  status VARCHAR(50) NOT NULL,
  result JSONB,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);
```