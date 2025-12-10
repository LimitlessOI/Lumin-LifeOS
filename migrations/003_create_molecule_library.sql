CREATE TABLE molecule_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    structure JSONB NOT NULL,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);