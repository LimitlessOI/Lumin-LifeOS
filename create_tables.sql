```sql
CREATE TABLE arw_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE arw_offices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES arw_users(id),
    layout JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE arw_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES arw_users(id),
    session_data JSON NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE arw_integrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES arw_users(id),
    integration_type VARCHAR(50) NOT NULL,
    credentials JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE arw_analytics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES arw_users(id),
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```