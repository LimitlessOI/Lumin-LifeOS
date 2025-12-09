-- Create sentinel_users table
CREATE TABLE IF NOT EXISTS sentinel_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sentinel_workspaces table
CREATE TABLE IF NOT EXISTS sentinel_workspaces (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    user_id INT REFERENCES sentinel_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sentinel_wellness_events table
CREATE TABLE IF NOT EXISTS sentinel_wellness_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    user_id INT REFERENCES sentinel_users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sentinel_challenges table
CREATE TABLE IF NOT EXISTS sentinel_challenges (
    id SERIAL PRIMARY KEY,
    challenge_name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INT REFERENCES sentinel_users(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sentinel_integrations table
CREATE TABLE IF NOT EXISTS sentinel_integrations (
    id SERIAL PRIMARY KEY,
    integration_name VARCHAR(255) NOT NULL,
    user_id INT REFERENCES sentinel_users(id),
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);