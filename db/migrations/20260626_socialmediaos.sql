-- SYNOPSIS: Database migration — 20260626_socialmediaos.sql.
-- ASSUMPTIONS:
-- 1. A 'users' table exists with a 'id' column of type UUID, which 'owner_id' will reference.
-- 2. Standard UUID primary keys and timestamp columns (created_at, updated_at) are used.
-- 3. Delivery tracking includes scheduled_for, started_at/published_at, completed_at, delivery_status, and delivery_error_message.

CREATE TABLE IF NOT EXISTS socialmediaos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'scheduled', 'publishing', 'published', 'failed'
    scheduled_for TIMESTAMP WITH TIME ZONE, -- When the session is planned to run
    started_at TIMESTAMP WITH TIME ZONE, -- When publishing actually started
    completed_at TIMESTAMP WITH TIME ZONE, -- When publishing finished (success or failure)
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed', 'failed'
    delivery_error_message TEXT, -- Detailed error message if delivery fails
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_owner_id ON socialmediaos_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_status ON socialmediaos_sessions (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_scheduled_for ON socialmediaos_sessions (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_delivery_status ON socialmediaos_sessions (delivery_status);

CREATE TABLE IF NOT EXISTS socialmediaos_content_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES socialmediaos_sessions(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'ready', 'published', 'archived'
    scheduled_for TIMESTAMP WITH TIME ZONE, -- When this specific pack is scheduled within the session
    published_at TIMESTAMP WITH TIME ZONE, -- When this specific pack was published
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed', 'failed'
    delivery_error_message TEXT, -- Detailed error message if delivery fails
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_session_id ON socialmediaos_content_packs (session_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_owner_id ON socialmediaos_content_packs (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_status ON socialmediaos_content_packs (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_scheduled_for ON socialmediaos_content_packs (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_delivery_status ON socialmediaos_content_packs (delivery_status);