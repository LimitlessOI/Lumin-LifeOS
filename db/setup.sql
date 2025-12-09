```sql
-- Create ubi_users table
CREATE TABLE ubi_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    biometric_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create value_contributions table
CREATE TABLE value_contributions (
    contribution_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES ubi_users(user_id),
    contribution_value NUMERIC,
    contribution_type VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ubi_distributions table
CREATE TABLE ubi_distributions (
    distribution_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES ubi_users(user_id),
    distribution_amount NUMERIC,
    distribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scoring_models table
CREATE TABLE scoring_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) UNIQUE,
    model_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_integrations table
CREATE TABLE payment_integrations (
    integration_id SERIAL PRIMARY KEY,
    payment_system VARCHAR(100),
    credentials JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);