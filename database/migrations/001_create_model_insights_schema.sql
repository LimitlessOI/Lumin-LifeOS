```sql
-- Create table for caching model insights
CREATE TABLE model_insights_cache (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    insights JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for logging user interactions with insights
CREATE TABLE insight_interactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    insight_id INT REFERENCES model_insights_cache(id),
    interaction_type VARCHAR(50) NOT NULL,
    interaction_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```