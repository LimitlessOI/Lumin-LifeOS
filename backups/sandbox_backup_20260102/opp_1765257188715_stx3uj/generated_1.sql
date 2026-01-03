BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS Make_Experts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty TEXT NOT NULL,
    ssl_certified BOOLEAN DEFAULT false, -- Assuming SSL certification is a simple boolean flag.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENTENT_TIMESTAMP,
    UNIQUE(name)
);
CREATE INDEX idx_expert_specialty ON Make_Experts (specialty); -- Index for efficient querying by specialty.
COMMIT;
===END FILE===