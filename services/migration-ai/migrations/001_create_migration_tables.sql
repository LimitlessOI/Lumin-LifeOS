```sql
CREATE TABLE migration_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE migration_templates (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES migration_projects(id),
    template_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generated_migrations (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES migration_projects(id),
    migration_script TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```