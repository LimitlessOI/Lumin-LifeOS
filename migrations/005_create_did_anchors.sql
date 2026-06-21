-- SYNOPSIS: Database migration — 005_create_did_anchors.sql.
CREATE TABLE did_anchors (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) NOT NULL,
    anchor_data JSONB NOT NULL,
    chain VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);