BEGIN;

CREATE TABLE leads (
    lead_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(255) NOT NULL
);

ALTER TABLE leads ADD CONSTRAINT unique_leads UNIQUE (source);

CREATE INDEX idx_created_at ON leads (created_at);
COMMIT;