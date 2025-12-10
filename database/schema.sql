```sql
-- Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Companies Table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AI Sessions Table
CREATE TABLE ai_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Peer Sessions Table
CREATE TABLE peer_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    peer_id INT REFERENCES users(id),
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Professional Sessions Table
CREATE TABLE professional_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    professional_id INT REFERENCES users(id),
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Risk Logs Table
CREATE TABLE risk_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    risk_score FLOAT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Escalation Workflows Table
CREATE TABLE escalation_workflows (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    workflow_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```