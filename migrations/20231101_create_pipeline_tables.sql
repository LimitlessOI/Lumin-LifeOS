```sql
CREATE TABLE pipeline_configs (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pipeline_runs (
    id SERIAL PRIMARY KEY,
    pipeline_config_id INT REFERENCES pipeline_configs(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    logs TEXT,
    CONSTRAINT fk_pipeline_config
      FOREIGN KEY(pipeline_config_id) 
	  REFERENCES pipeline_configs(id)
);
```