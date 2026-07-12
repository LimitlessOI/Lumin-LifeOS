-- SYNOPSIS: Database migration — 20260712_wellness_therapist_integration.sql.
CREATE TABLE IF NOT EXISTS therapist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL UNIQUE,
  display_name text,
  approach text,
  session_frequency text,
  focus_areas jsonb DEFAULT '[]'::jsonb,
  crisis_contact text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS therapist_client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_user_id bigint NOT NULL,
  client_user_id bigint NOT NULL,
  status text DEFAULT 'pending',
  client_consented_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (therapist_user_id, client_user_id)
);

CREATE TABLE IF NOT EXISTS session_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id bigint NOT NULL,
  therapist_user_id bigint,
  period_start date,
  period_end date,
  brief_json jsonb NOT NULL,
  client_reviewed_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz DEFAULT now()
);