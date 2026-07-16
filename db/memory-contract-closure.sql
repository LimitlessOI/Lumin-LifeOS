-- SYNOPSIS: SQL — memory-contract-closure.sql.
CREATE TABLE IF NOT EXISTS closure_contract (
    id SERIAL PRIMARY KEY,
    phase INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    assertion TEXT
);

INSERT INTO closure_contract (phase, status, assertion)
VALUES 
    (2, 'executed', 'C09 Build Closure Contract'),
    (2, 'executed', 'C21'),
    (2, 'executed', 'C02')
ON CONFLICT (phase)
DO UPDATE SET 
    status = EXCLUDED.status,
    assertion = EXCLUDED.assertion
WHERE closure_contract.phase = EXCLUDED.phase;