```sql
CREATE TABLE health_guardian_users (
    user_id SERIAL PRIMARY KEY,
    user_data JSONB
);

CREATE TABLE global_health_models (
    model_id SERIAL PRIMARY KEY,
    model_data JSONB
);

CREATE TABLE health_insights (
    insight_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES health_guardian_users(user_id),
    insight_data JSONB
);
```