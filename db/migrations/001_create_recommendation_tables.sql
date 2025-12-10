```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_recommendation_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    interaction_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ab_test_recommendations (
    id SERIAL PRIMARY KEY,
    test_group VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    recommendation_data JSONB NOT NULL,
    result VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);