```sql
CREATE TABLE user_health_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutrition_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    dietary_preferences JSONB,
    allergens JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diet_plans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_details JSONB,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutrition_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    log_date DATE NOT NULL,
    meals JSONB,
    total_calories FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_model_versions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```