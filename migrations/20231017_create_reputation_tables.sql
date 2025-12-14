```sql
CREATE TABLE reputation_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    reputation_score DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reputation_events (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES reputation_profiles(id),
    event_type VARCHAR(255),
    event_value DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moderation_cases (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES reputation_profiles(id),
    case_details TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```