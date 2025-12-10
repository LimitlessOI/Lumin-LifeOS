```sql
-- Create env_templates table
CREATE TABLE IF NOT EXISTS env_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_env_configs table
CREATE TABLE IF NOT EXISTS user_env_configs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    env_template_id INT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (env_template_id) REFERENCES env_templates(id)
);

-- Create code_generation_jobs table
CREATE TABLE IF NOT EXISTS code_generation_jobs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    job_status VARCHAR(50) NOT NULL,
    code_output TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```