-- SYNOPSIS: Creates the initial MarketingOS tables for consent, sessions, content extractions, content pieces, and channel profiles.

CREATE TABLE IF NOT EXISTS marketing_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_type TEXT NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    data_policy_version TEXT NOT NULL,
    CHECK (consent_type IN ('email', 'sms', 'push', 'cookie_analytics', 'cookie_marketing')),
    CHECK (revoked_at IS NULL OR revoked_at > consented_at),
    CONSTRAINT no_revocation_update CHECK (OLD.revoked_at IS NULL OR NEW.revoked_at = OLD.revoked_at)
);

CREATE INDEX IF NOT EXISTS idx_marketing_consent_records_user_id ON marketing_consent_records (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_consent_records_consent_type ON marketing_consent_records (consent_type);

CREATE TABLE IF NOT EXISTS marketing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_record_id UUID REFERENCES marketing_consent_records(id),
    session_type TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB,
    CHECK (session_type IN ('website_visit', 'app_session', 'email_interaction', 'sms_interaction', 'ad_interaction'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_sessions_user_id ON marketing_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sessions_session_type ON marketing_sessions (session_type);

CREATE TABLE IF NOT EXISTS marketing_content_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    input_mode TEXT NOT NULL,
    status TEXT NOT NULL,
    extraction_type TEXT NOT NULL,
    extracted_data JSONB,
    CHECK (input_mode IN ('manual', 'api', 'scrape', 'webhook')),
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CHECK (extraction_type IN ('text', 'image', 'audio', 'video', 'structured_data'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_extractions_session_id ON marketing_content_extractions (session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_extractions_status ON marketing_content_extractions (status);

CREATE TABLE IF NOT EXISTS marketing_content_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES marketing_content_extractions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT,
    content TEXT,
    url TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_pieces_extraction_id ON marketing_content_pieces (extraction_id);

CREATE TABLE IF NOT EXISTS marketing_channel_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    profile_identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CHECK (platform IN ('email', 'sms', 'push', 'facebook', 'instagram', 'twitter', 'linkedin', 'google_ads', 'tiktok')),
    UNIQUE (user_id, platform, profile_identifier)
);

CREATE INDEX IF NOT EXISTS idx_marketing_channel_profiles_user_id ON marketing_channel_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_channel_profiles_platform ON marketing_channel_profiles (platform);