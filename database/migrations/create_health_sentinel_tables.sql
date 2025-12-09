```sql
CREATE TABLE health_sentinel_users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_data_streams (
    stream_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES health_sentinel_users(user_id),
    data JSONB,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_predictions (
    prediction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES health_sentinel_users(user_id),
    prediction JSONB,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_nudges (
    nudge_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES health_sentinel_users(user_id),
    nudge TEXT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    model_id SERIAL PRIMARY KEY,
    model_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```