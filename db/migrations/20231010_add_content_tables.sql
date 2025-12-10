```sql
-- Migration to add content_requests and content_templates tables

CREATE TABLE content_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    template_id INT,
    request_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES content_templates(id),
    FOREIGN KEY (user_id) REFERENCES users(id) -- Assuming a users table exists
);
```