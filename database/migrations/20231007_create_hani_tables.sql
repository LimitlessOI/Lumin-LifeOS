```sql
-- SQL script to create the required tables for HANI system

-- Table for storing neural profiles
CREATE TABLE neural_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing neural patterns
CREATE TABLE neural_patterns (
    id SERIAL PRIMARY KEY,
    profile_id INT NOT NULL REFERENCES neural_profiles(id),
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing HANI devices
CREATE TABLE hani_devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing SDK applications
CREATE TABLE sdk_applications (
    id SERIAL PRIMARY KEY,
    developer_id INT NOT NULL,
    application_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);