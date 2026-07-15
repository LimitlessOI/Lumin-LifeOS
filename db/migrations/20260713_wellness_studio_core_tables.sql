-- SYNOPSIS: Database migration — 20260713_wellness_studio_core_tables.sql.
CREATE TABLE IF NOT EXISTS wellness_studio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_type text NOT NULL,
  joy_checkin_id uuid,
  integrity_score_log_id uuid,
  wearable_data_id uuid,
  emotional_pattern_id uuid,
  session_notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_user_id_idx
  ON wellness_studio_sessions(user_id);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_session_type_idx
  ON wellness_studio_sessions(session_type);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_status_idx
  ON wellness_studio_sessions(status);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_joy_checkin_id_idx
  ON wellness_studio_sessions(joy_checkin_id);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_integrity_score_log_id_idx
  ON wellness_studio_sessions(integrity_score_log_id);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_wearable_data_id_idx
  ON wellness_studio_sessions(wearable_data_id);

CREATE INDEX IF NOT EXISTS wellness_studio_sessions_emotional_pattern_id_idx
  ON wellness_studio_sessions(emotional_pattern_id);

CREATE TABLE IF NOT EXISTS wellness_studio_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES wellness_studio_sessions(id),
  insight_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wellness_studio_insights_user_id_idx
  ON wellness_studio_insights(user_id);

CREATE INDEX IF NOT EXISTS wellness_studio_insights_session_id_idx
  ON wellness_studio_insights(session_id);

CREATE INDEX IF NOT EXISTS wellness_studio_insights_insight_type_idx
  ON wellness_studio_insights(insight_type);