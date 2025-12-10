```sql
CREATE TABLE learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_paths (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES learning_profiles(id),
    path JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES learning_profiles(id),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);