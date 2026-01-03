---FILE:migrations/2019_10_30_144158_create_consultations_table.sql---
CREATE TABLE IF NOT EXISTS consultations (
    consultation_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    service_type VARCHAR(255), -- Assuming this represents the type of automation solution discussed. Adjust as needed.
    duration INTERVAL NOT NULL,  -- Using PostgreSQL's interval data type for simplicity in handling durations.
    notes TEXT
);