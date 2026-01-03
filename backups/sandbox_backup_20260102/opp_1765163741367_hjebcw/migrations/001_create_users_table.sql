CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    target_demographic JSONB, -- {age_group: '25-34', location: 'USA'}
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) CHECK (status IN ('active', 'inactive', 'completed'))
);

CREATE TABLE IF NOT EXISTS user_interactions (
    interaction_id SERIAL PRIMARY KEY,
    email VARCHAR REFERENCES users(email),
    campaign_id INT REFERENCES campaigns(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);