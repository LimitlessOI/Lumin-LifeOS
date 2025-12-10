```sql
-- Create table for learning profiles
CREATE TABLE learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for learning sessions
CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Create table for content adaptation rules
CREATE TABLE content_adaptation_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_definition JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for progress metrics
CREATE TABLE progress_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```