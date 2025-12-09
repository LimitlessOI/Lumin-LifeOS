```sql
-- Create table for assessments
CREATE TABLE IF NOT EXISTS abnn_assessments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for events
CREATE TABLE IF NOT EXISTS abnn_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for resources
CREATE TABLE IF NOT EXISTS abnn_resources (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    details JSONB NOT NULL,
    availability_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for matches
CREATE TABLE IF NOT EXISTS abnn_matches (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    match_score FLOAT NOT NULL,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for community insights
CREATE TABLE IF NOT EXISTS abnn_community_insights (
    id SERIAL PRIMARY KEY,
    insights_data JSONB NOT NULL,
    aggregated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```