```sql
-- Create nats_environments table
CREATE TABLE nats_environments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create nats_sessions table
CREATE TABLE nats_sessions (
    id SERIAL PRIMARY KEY,
    environment_id INT REFERENCES nats_environments(id),
    user_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);

-- Create nats_hardware table
CREATE TABLE nats_hardware (
    id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create nats_ai_guides table
CREATE TABLE nats_ai_guides (
    id SERIAL PRIMARY KEY,
    guide_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```