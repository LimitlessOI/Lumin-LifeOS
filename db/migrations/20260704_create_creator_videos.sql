-- SYNOPSIS: Database migration — 20260704_create_creator_videos.sql.
CREATE TABLE IF NOT EXISTS creator_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  script_id UUID NOT NULL,
  format TEXT,
  edit_status TEXT,
  publish_status TEXT,
  storage_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_creator_videos_channel_id ON creator_videos (channel_id);
CREATE INDEX IF NOT EXISTS idx_creator_videos_script_id ON creator_videos (script_id);
CREATE INDEX IF NOT EXISTS idx_creator_videos_edit_status ON creator_videos (edit_status);
CREATE INDEX IF NOT EXISTS idx_creator_videos_publish_status ON creator_videos (publish_status);