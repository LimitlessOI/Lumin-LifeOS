BEGIN;

-- ── vision_sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vision_sessions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_type     TEXT NOT NULL DEFAULT 'end_of_life'
                     CHECK (session_type IN ('end_of_life','future_self','compounding_timeline','legacy')),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','completed')),
  turns            JSONB NOT NULL DEFAULT '[]',
  answers          JSONB DEFAULT NULL,
  narrative        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vision_sessions_user_id_idx ON vision_sessions(user_id);

-- ── future_videos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS future_videos (
  id                       BIGSERIAL PRIMARY KEY,
  user_id                  BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  vision_session_id        BIGINT REFERENCES vision_sessions(id) ON DELETE SET NULL,
  video_type               TEXT NOT NULL
                             CHECK (video_type IN ('future_life','compounding_timeline','legacy','weekly_reflection')),
  prompt_used              TEXT,
  replicate_prediction_id  TEXT,
  status                   TEXT NOT NULL DEFAULT 'queued'
                             CHECK (status IN ('queued','processing','completed','failed')),
  video_url                TEXT,
  thumbnail_url            TEXT,
  duration_seconds         INTEGER,
  script                   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS future_videos_user_id_idx ON future_videos(user_id);

-- ── timeline_projections ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_projections (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  projection_type  TEXT NOT NULL
                     CHECK (projection_type IN ('current_trajectory','aligned_trajectory')),
  year_1           TEXT,
  year_5           TEXT,
  year_20          TEXT,
  key_decisions    TEXT[],
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timeline_projections_user_id_idx ON timeline_projections(user_id);

-- ── updated_at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_vision_sessions_updated_at'
  ) THEN
    CREATE TRIGGER set_vision_sessions_updated_at
      BEFORE UPDATE ON vision_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_future_videos_updated_at'
  ) THEN
    CREATE TRIGGER set_future_videos_updated_at
      BEFORE UPDATE ON future_videos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
