CREATE TABLE stripe_integration_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255),
    event_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE env_templates (
    id SERIAL PRIMARY KEY,
    framework_name VARCHAR(255),
    template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--