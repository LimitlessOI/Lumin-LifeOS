```sql
CREATE TABLE fraud_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE behavioral_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    behavior_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE threat_intelligence (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fraud_incidents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    incident_details JSONB NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```