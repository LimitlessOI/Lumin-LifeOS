CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('web', 'app', 'email', 'sms', 'push', 'api', 'other')),
    input_mode TEXT NOT NULL CHECK (input_mode IN ('manual', 'automated', 'user_initiated', 'system_initiated')),
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'pending', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON marketing_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON marketing_sessions (status);

CREATE TABLE IF NOT EXISTS marketing_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    session_id UUID REFERENCES marketing_sessions(id),
    consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing_email', 'marketing_sms', 'analytics', 'personalization', 'terms_of_service', 'privacy_policy', 'other')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_owner ON marketing_consent_records (owner_id);
CREATE INDEX IF NOT EXISTS idx_consent_session ON marketing_consent_records (session_id);

CREATE TABLE IF NOT EXISTS marketing_content_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES marketing_sessions(id) ON DELETE CASCADE,
    extraction_type TEXT NOT NULL CHECK (extraction_type IN ('text', 'image_metadata', 'video_metadata', 'audio_metadata', 'sentiment', 'keywords', 'summary', 'other')),
    extracted_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_session ON marketing_content_extractions (session_id);
CREATE INDEX IF NOT EXISTS idx_extractions_type ON marketing_content_extractions (extraction_type);

CREATE TABLE IF NOT EXISTS marketing_content_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES marketing_sessions(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'mobile_app', 'email', 'sms', 'push_notification', 'social_media', 'internal', 'other')),
    format TEXT NOT NULL CHECK (format IN ('html', 'text', 'json', 'markdown', 'image', 'video', 'audio', 'pdf', 'other')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived', 'scheduled', 'failed', 'pending')),
    content_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);