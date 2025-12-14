```sql
-- Migration for creating workflows, workflow_metrics, and workflow_versions tables

CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_metrics (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflows(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_versions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflows(id),
    version_number INT NOT NULL,
    changes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);