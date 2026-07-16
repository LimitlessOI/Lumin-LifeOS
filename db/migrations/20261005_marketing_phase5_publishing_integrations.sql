-- SYNOPSIS: Database migration — 20261005_marketing_phase5_publishing_integrations.sql.
-- Create table for scheduling posts on social platforms
CREATE TABLE IF NOT EXISTS social_platform_scheduling (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(50) NOT NULL,
    post_content TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add an index for platform_name to optimize queries
CREATE INDEX idx_platform_name ON social_platform_scheduling(platform_name);
