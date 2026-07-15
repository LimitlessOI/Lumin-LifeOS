-- SYNOPSIS: SQL — memory-contract-closure.sql.
CREATE TABLE IF NOT EXISTS contract_closure (
    id SERIAL PRIMARY KEY,
    contract_id INT NOT NULL,
    closure_date DATE NOT NULL,
    closure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS contract_closure
ADD COLUMN IF NOT EXISTS closure_status VARCHAR(50) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_contract_closure_contract_id
ON contract_closure (contract_id);

INSERT INTO contract_closure (contract_id, closure_date, closure_reason, closure_status)
SELECT contract_id, CURRENT_DATE, 'Phase 2 build closure', 'completed'
FROM contracts
WHERE phase = 2
AND NOT EXISTS (
    SELECT 1 FROM contract_closure
    WHERE contract_closure.contract_id = contracts.contract_id
    AND closure_reason = 'Phase 2 build closure'
);