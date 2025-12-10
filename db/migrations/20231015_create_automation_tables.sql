```sql
CREATE TABLE automation_users (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_automations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    integration_id INT NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES automation_users (id),
    FOREIGN KEY (integration_id) REFERENCES automation_integrations (id)
);

CREATE TABLE automation_logs (
    id SERIAL PRIMARY KEY,
    automation_id INT NOT NULL,
    log TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES user_automations (id)
);
```