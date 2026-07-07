-- SYNOPSIS: Creates the initial MarketingOS database schema.
CREATE TABLE IF NOT EXISTS marketing_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('opt_in', 'opt_out')),
    source TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_consent_records_user_type_source ON marketing_consent_records (user_id, consent_type, source) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_consent_records_user_id ON marketing_consent_records (user_id);

CREATE TABLE IF NOT EXISTS marketing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_record_id UUID REFERENCES marketing_consent_records(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('web', 'email', 'app', 'api')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_sessions_consent_record_id ON marketing_sessions (consent_record_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sessions_start_time ON marketing_sessions (start_time);

CREATE TABLE IF NOT EXISTS marketing_content_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
    input_mode TEXT NOT NULL CHECK (input_mode IN ('manual', 'api', 'crawler')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extraction_type TEXT NOT NULL CHECK (extraction_type IN ('text', 'image', 'audio', 'video', 'document', 'webpage')),
    source_url TEXT,
    extracted_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_extractions_session_id ON marketing_content_extractions (session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_extractions_status ON marketing_content_extractions (status);

CREATE TABLE IF NOT EXISTS marketing_content_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES marketing_content_extractions(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_pieces_extraction_id ON marketing_content_pieces (extraction_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_pieces_published_at ON marketing_content_pieces (published_at);

CREATE TABLE IF NOT EXISTS marketing_channel_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('email', 'sms', 'push', 'webhook', 'in_app')),
    identifier TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('text', 'html', 'json', 'xml')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform, identifier)
);

CREATE INDEX IF NOT EXISTS idx_marketing_channel_profiles_user_id ON marketing_channel_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_channel_profiles_platform ON marketing_channel_profiles (platform);