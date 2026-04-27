-- Migration: Assessment Battery
-- Creates table for storing user assessment results (attachment style, love language, etc.)

CREATE TABLE IF NOT EXISTS assessment_results (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('attachment_style', 'love_language', 'conflict_style', 'communication_style', 'personality_snapshot')),
    result_key TEXT NOT NULL,
    result_label TEXT NOT NULL,
    score NUMERIC(5,2),
    raw_answers JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT assessment_results_user_type_version_unique UNIQUE (user_id, assessment_type, version)
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_type ON assessment_results(user_id, assessment_type);

COMMENT ON TABLE assessment_results IS 'Stores results from various psychological and relational assessments';
COMMENT ON COLUMN assessment_results.assessment_type IS 'Type of assessment taken';
COMMENT ON COLUMN assessment_results.result_key IS 'Machine-readable result identifier (e.g., anxious, secure, words_of_affirmation)';
COMMENT ON COLUMN assessment_results.result_label IS 'Human-readable result description';
COMMENT ON COLUMN assessment_results.score IS 'Optional numeric score or percentage for the result';
COMMENT ON COLUMN assessment_results.raw_answers IS 'Original question-answer pairs stored as JSON for potential recalculation';
COMMENT ON COLUMN assessment_results.version IS 'Assessment version number to support schema evolution';