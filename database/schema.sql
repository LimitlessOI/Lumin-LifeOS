```sql
-- Table for storing user learning profiles
CREATE TABLE learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    cognitive_data JSONB,
    emotional_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing learning sessions
CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Table for storing peer matches
CREATE TABLE peer_matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    peer_user_id INTEGER NOT NULL,
    match_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing school dashboards
CREATE TABLE school_dashboards (
    id SERIAL PRIMARY KEY,
    school_id INTEGER UNIQUE NOT NULL,
    analytics_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```