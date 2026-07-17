-- SYNOPSIS: Database migration — amendment_21_layer_12.sql.
CREATE TABLE IF NOT EXISTS layer_12 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layer_12_name ON layer_12(name);

ALTER TABLE layer_12
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';