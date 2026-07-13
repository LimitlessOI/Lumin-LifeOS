-- SYNOPSIS: Database migration — 20260713_marketing_r2_uploads.sql.
CREATE TABLE IF NOT EXISTS marketing_audio_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  r2_key text NOT NULL,
  r2_url text,
  upload_status text NOT NULL DEFAULT 'pending',
  error_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_audio_uploads_session_id
  ON marketing_audio_uploads (session_id);

CREATE INDEX IF NOT EXISTS idx_marketing_audio_uploads_upload_status
  ON marketing_audio_uploads (upload_status);