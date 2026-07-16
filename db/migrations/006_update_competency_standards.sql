-- SYNOPSIS: Database migration — 006_update_competency_standards.sql.
BEGIN;

-- Assuming a table structure, modify as needed
CREATE TABLE IF NOT EXISTS competency_standards (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255),
    competency VARCHAR(255),
    definition TEXT
);

-- Insert detailed competency standards
INSERT INTO competency_standards (domain, competency, definition) VALUES
('Domain1', 'Competency1', 'Detailed definition of Competency1 for Domain1'),
('Domain1', 'Competency2', 'Detailed definition of Competency2 for Domain1'),
('Domain2', 'Competency1', 'Detailed definition of Competency1 for Domain2'),
-- Add more as needed
;

COMMIT;
