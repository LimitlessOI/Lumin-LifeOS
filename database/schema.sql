CREATE TABLE xr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE phygital_links (
    id SERIAL PRIMARY KEY,
    link_type VARCHAR(50),
    link_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE xr_analytics (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES xr_sessions(id),
    analytics_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_personalization (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    personalization_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);