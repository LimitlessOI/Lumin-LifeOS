-- SYNOPSIS: Database migration — 202606013.sql.
-- db/migrations/202606013.sql

CREATE TABLE IF NOT EXISTS epistemic_facts (
    id SERIAL PRIMARY KEY,
    fact TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
