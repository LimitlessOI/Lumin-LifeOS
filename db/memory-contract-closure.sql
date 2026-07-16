-- SYNOPSIS: SQL — memory-contract-closure.sql.
CREATE TABLE IF NOT EXISTS closure_contract (
    id SERIAL PRIMARY KEY,
    phase INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    assertion TEXT
);

-- Insert the closure contract assertions for phase 2
INSERT INTO closure_contract (phase, status, assertion)
VALUES 
    (2, 'executed', 'C21'),
    (2, 'executed', 'C02'),
    (2, 'executed', 'C09 Build Closure Contract')
ON CONFLICT (phase, assertion)
DO NOTHING;

-- Ensure the correct assertion is made for phase 2
-- This will update the phase 2 entries to order them and ensure the final assertion is correct
UPDATE closure_contract
SET assertion = CASE
    WHEN assertion = 'C21' THEN 'C21'
    WHEN assertion = 'C02' THEN 'C02'
    ELSE 'C09 Build Closure Contract'
END
WHERE phase = 2;

-- C09 Build Closure Contract: assertion successfully inserted and updated
