CREATE TABLE IF NOT EXISTS revenue (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id),
    stripe_charge_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) CHECK (amount > 0),
    currency CHAR(3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    encrypted BOOLEAN ENCRYPTED COLUMN sensitive_data USING pgcrypto.digest(sensitive_text) STORED -- Assuming 'SensitiveData' is an optional column for private info
);