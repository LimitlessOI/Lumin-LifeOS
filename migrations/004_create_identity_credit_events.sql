CREATE TABLE identity_credit_events (
    id SERIAL PRIMARY KEY,
    identity_id INT REFERENCES identity_profiles(id),
    event_data JSONB NOT NULL,
    score_adjustment DECIMAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);