```sql
-- Drop tables if they already exist
DROP TABLE IF EXISTS empathy_devices CASCADE;
DROP TABLE IF EXISTS empathy_sessions CASCADE;
DROP TABLE IF EXISTS empathy_subscriptions CASCADE;

-- Create empathy_devices table
CREATE TABLE empathy_devices (
    device_id SERIAL PRIMARY KEY,
    device_uuid UUID NOT NULL,
    firmware_version VARCHAR(50),
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create empathy_sessions table
CREATE TABLE empathy_sessions (
    session_id SERIAL PRIMARY KEY,
    device_id INT REFERENCES empathy_devices(device_id),
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create empathy_subscriptions table
CREATE TABLE empathy_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);