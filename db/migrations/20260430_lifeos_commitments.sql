-- LifeOS commitments tracking
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

CREATE TABLE IF NOT EXISTS lifeos_commitments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    source VARCHAR(100) DEFAULT 'manual',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE lifeos_commitments IS 'Tracks commitments made by users for accountability';

CREATE INDEX IF NOT EXISTS idx_commitments_user_status ON lifeos_commitments(user_id, status, due_date);