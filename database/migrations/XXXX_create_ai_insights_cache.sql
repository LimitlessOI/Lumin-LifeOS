CREATE TABLE ai_insights_cache (
    id SERIAL PRIMARY KEY,
    insight_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);