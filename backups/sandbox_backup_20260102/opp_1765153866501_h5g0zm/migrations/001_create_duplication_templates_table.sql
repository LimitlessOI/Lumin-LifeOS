CREATE TABLE IF NOT EXISTS duplication_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    success_rate DOUBLE PRECISION CHECK (success_rate >= 0 AND success_rate <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);