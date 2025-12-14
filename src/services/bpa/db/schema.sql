```sql
CREATE TABLE IF NOT EXISTS bpa_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bpa_projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES bpa_clients(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bpa_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES bpa_projects(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```