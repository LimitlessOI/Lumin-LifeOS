-- SYNOPSIS: Database migration — 20260806_voice_rail_stt_quality_receipts.sql
-- Voice Rail STT — per-transcription confidence/quality audit receipts.
BEGIN;

CREATE TABLE IF NOT EXISTS voice_rail_stt_quality_receipts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  engine TEXT,
  raw_transcript TEXT NOT NULL,
  corrected_transcript TEXT,
  quality_checked BOOLEAN NOT NULL DEFAULT FALSE,
  low_confidence BOOLEAN NOT NULL DEFAULT FALSE,
  avg_logprob DOUBLE PRECISION,
  no_speech_prob DOUBLE PRECISION,
  compression_ratio DOUBLE PRECISION,
  correction_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_rail_stt_quality_receipts_user
  ON voice_rail_stt_quality_receipts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_rail_stt_quality_receipts_low_confidence
  ON voice_rail_stt_quality_receipts (user_id, low_confidence, created_at DESC)
  WHERE low_confidence = TRUE;

COMMIT;
