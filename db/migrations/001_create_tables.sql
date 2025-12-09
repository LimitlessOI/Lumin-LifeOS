```sql
CREATE TABLE user_preferences (
    user_id SERIAL PRIMARY KEY,
    preferences JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_generation_jobs (
    job_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content_type VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id)
);

CREATE TABLE engagement_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    engagement_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id)
);

CREATE TABLE ai_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    version VARCHAR(20),
    config JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);