-- SYNOPSIS: Database migration — 202604261.sql.
CREATE TABLE IF NOT EXISTS epistemic_facts (
    id SERIAL PRIMARY KEY,
    fact_name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assuming SSOT receipts and ENV_REGISTRY provide initial seed data
-- INSERT INTO epistemic_facts (fact_name, description, source) VALUES
-- ('Initial Fact 1', 'Description for Fact 1', 'SSOT'),
-- ('Initial Fact 2', 'Description for Fact 2', 'ENV_REGISTRY');