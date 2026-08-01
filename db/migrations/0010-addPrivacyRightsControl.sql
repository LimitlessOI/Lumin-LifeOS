-- SYNOPSIS: Database migration — 0010-addPrivacyRightsControl.sql.
-- CREATE TABLE IF NOT EXISTS
-- Rights mode is visible and explicit per project
-- Privacy modes (private/shared/public/remix) are enforced
CREATE TABLE IF NOT EXISTS story_studio_rights_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
