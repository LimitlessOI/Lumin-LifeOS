-- BPB-0001 Mission Runtime v1 — Phase 1 DB migration
-- PRESCRIBED: do not deviate from column names, types, or constraints
CREATE TABLE IF NOT EXISTS missions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        UNIQUE NOT NULL,
    title            TEXT        NOT NULL,
    purpose