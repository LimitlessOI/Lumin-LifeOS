```sql
CREATE TABLE health_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_data_streams (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES health_profiles(id),
    data_type VARCHAR(50),
    data JSONB,
    recorded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trajectory_forecasts (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES health_profiles(id),
    forecast_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE micro_interventions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES health_profiles(id),
    intervention_data JSONB,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_credit_transactions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES health_profiles(id),
    amount DECIMAL,
    transaction_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);