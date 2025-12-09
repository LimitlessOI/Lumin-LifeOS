```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    cognitive_profile JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    skills JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    blockchain_id VARCHAR(255) UNIQUE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```