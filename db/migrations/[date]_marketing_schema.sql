-- MarketingOS Phase 1 schema.
-- @ssot docs/projects/AMENDMENT_41_MARKETINGOS.md

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketing_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('session_recording', 'voice_reuse', 'likeness_reuse', 'data_sharing')),
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  session_id UUID,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT no_revocation_update CHECK (revoked_at IS NULL OR revoked_at > consented_at)
);

CREATE INDEX IF NOT EXISTS idx_consent_owner ON marketing_consent_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_consent_session ON marketing_consent_records(session_id);

CREATE TABLE IF NOT EXISTS marketing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  business_id UUID,
  consent_record_id UUID NOT NULL REFERENCES marketing_consent_records(id),
  session_type TEXT NOT NULL DEFAULT 'coaching' CHECK (session_type IN ('coaching', 'interview', 'freestyle')),
  input_mode TEXT NOT NULL DEFAULT 'text' CHECK (input_mode IN ('text', 'audio', 'both')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'extracting', 'generating', 'completed', 'abandoned')),
  raw_audio_url TEXT,
  transcript_text TEXT,
  coach_messages_json JSONB NOT NULL DEFAULT '[]',
  extraction_run_at TIMESTAMPTZ,
  generation_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON marketing_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON marketing_sessions(status);

CREATE TABLE IF NOT EXISTS marketing_content_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('hook', 'story', 'teaching', 'objection', 'offer', 'cta', 'emotional_truth')),
  raw_text TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  source_quote TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_session ON marketing_content_extractions(session_id);
CREATE INDEX IF NOT EXISTS idx_extractions_type ON marketing_content_extractions(extraction_type);

CREATE TABLE IF NOT EXISTS marketing_content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES marketing_content_extractions(id),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'x', 'facebook', 'email', 'general')),
  format TEXT NOT NULL CHECK (format IN ('post', 'caption', 'hook', 'subject_line', 'thread', 'short_script')),
  content_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'rejected')),
  generated_by_model TEXT,
  regeneration_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pieces_session ON marketing_content_pieces(session_id);
CREATE INDEX IF NOT EXISTS idx_pieces_status ON marketing_content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_pieces_platform ON marketing_content_pieces(platform);

CREATE TABLE IF NOT EXISTS marketing_channel_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE,
  business_id UUID,
  channel_name TEXT,
  niche TEXT,
  brand_voice_json JSONB NOT NULL DEFAULT '{}',
  audience_json JSONB NOT NULL DEFAULT '{}',
  posting_cadence_json JSONB NOT NULL DEFAULT '{}',
  performance_memory_json JSONB NOT NULL DEFAULT '{}',
  sessions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_profile_owner ON marketing_channel_profiles(owner_id);