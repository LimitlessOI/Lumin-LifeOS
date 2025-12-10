```sql
CREATE TABLE health_baselines (
    user_id UUID PRIMARY KEY,
    baseline_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID REFERENCES health_baselines(user_id),
    session_data JSONB NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

CREATE TABLE health_interventions (
    intervention_id UUID PRIMARY KEY,
    user_id UUID REFERENCES health_baselines(user_id),
    intervention_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_updates (
    update_id UUID PRIMARY KEY,
    algorithm_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```