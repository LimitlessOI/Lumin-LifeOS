-- SYNOPSIS: Database migration — AMENDMENT_21.sql.
CREATE TABLE IF NOT EXISTS layer12_table1 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS layer12_table2 (
    id SERIAL PRIMARY KEY,
    description TEXT,
    layer12_table1_id INTEGER REFERENCES layer12_table1(id) ON DELETE CASCADE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS layer12_table1
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_layer12_table2_layer12_table1_id 
ON layer12_table2(layer12_table1_id);