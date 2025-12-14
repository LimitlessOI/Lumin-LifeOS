```sql
-- Create code_projects table
CREATE TABLE IF NOT EXISTS code_projects (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create code_templates table
CREATE TABLE IF NOT EXISTS code_templates (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES code_projects(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_code_preferences table
CREATE TABLE IF NOT EXISTS user_code_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    language_preference VARCHAR(50),
    theme_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```