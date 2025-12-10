```sql
-- Table for storing AI-generated routes
CREATE TABLE ai_generated_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    route_path VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for logging code generation activities
CREATE TABLE code_generation_logs (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES ai_generated_routes(id),
    action VARCHAR(255) NOT NULL,
    log_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing metrics templates
CREATE TABLE metrics_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_definition JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```