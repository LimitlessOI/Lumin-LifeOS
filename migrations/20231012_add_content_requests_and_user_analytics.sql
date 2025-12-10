```sql
-- Migration script to add 'content_requests' and 'user_analytics' tables

-- Create content_requests table
CREATE TABLE content_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_analytics table
CREATE TABLE user_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint to user_id if users table exists
ALTER TABLE content_requests ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE user_analytics ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
```