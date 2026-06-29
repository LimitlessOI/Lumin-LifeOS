-- SYNOPSIS: Database migration — 20260626_socialmediaos.sql.
-- MOS-P1-001: Create socialmediaos_sessions and socialmediaos_content_packs tables

-- Create socialmediaos_sessions table
CREATE TABLE IF NOT EXISTS socialmediaos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'scheduled', 'active', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ, -- Timestamp when the session content was delivered/published
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed', 'failed'
    delivery_message TEXT -- Optional message for delivery details or errors
);

-- Create indexes for socialmediaos_sessions
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_owner_id ON socialmediaos_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_status ON socialmediaos_sessions (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_delivery_status ON socialmediaos_sessions (delivery_status);

-- Create socialmediaos_content_packs table
CREATE TABLE IF NOT EXISTS socialmediaos_content_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'ready', 'published', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ, -- Timestamp when the content pack was delivered/published
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed', 'failed'
    delivery_message TEXT -- Optional message for delivery details or errors
);

-- Create indexes for socialmediaos_content_packs
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_owner_id ON socialmediaos_content_packs (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_status ON socialmediaos_content_packs (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_delivery_status ON socialmediaos_content_packs (delivery_status);