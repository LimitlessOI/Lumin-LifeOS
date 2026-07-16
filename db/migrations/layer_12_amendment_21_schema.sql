-- SYNOPSIS: Database migration — layer_12_amendment_21_schema.sql.
-- Placeholder for Layer 12 / Amendment 21 core schema extension.
-- Real tables will be added once AMENDMENT_21 scope is finalized.
CREATE TABLE IF NOT EXISTS layer_12_amendment_21_marker (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
