-- SYNOPSIS: Database migration — 20260626_socialmediaos.sql.
-- Create socialmediaos_sessions table
CREATE TABLE IF NOT EXISTS socialmediaos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on owner_id for socialmediaos_sessions
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_owner_id ON socialmediaos_sessions (owner_id);

-- Create index on status for socialmediaos_sessions
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_status ON socialmediaos_sessions (status);

-- Create socialmediaos_content_packs table
CREATE TABLE IF NOT EXISTS socialmediaos_content_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    session_id UUID, -- Link to socialmediaos_sessions
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_session
        FOREIGN KEY(session_id)
        REFERENCES socialmediaos_sessions(id)
        ON DELETE SET NULL
);

-- Create index on owner_id for socialmediaos_content_packs
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_owner_id ON socialmediaos_content_packs (owner_id);

-- Create index on session_id for socialmediaos_content_packs
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_session_id ON socialmediaos_content_packs (session_id);

-- Create index on status for socialmediaos_content_packs
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_status ON socialmediaos_content_packs (status);