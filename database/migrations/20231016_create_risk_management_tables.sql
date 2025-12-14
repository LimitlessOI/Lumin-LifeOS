```sql
CREATE TABLE risk_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    risk_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alternative_data_feeds (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(255),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_immunization_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    strategy JSONB NOT NULL,
    effectiveness_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);