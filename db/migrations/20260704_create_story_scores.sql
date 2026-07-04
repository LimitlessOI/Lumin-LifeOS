-- SYNOPSIS: Database migration — 20260704_create_story_scores.sql.
CREATE TABLE IF NOT EXISTS story_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  scoring_mode TEXT NOT NULL,
  score_type TEXT NOT NULL,
  score_value NUMERIC(3,2) NOT NULL,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_scores_project_id ON story_scores (project_id);
CREATE INDEX IF NOT EXISTS idx_story_scores_scoring_mode ON story_scores (scoring_mode);
CREATE INDEX IF NOT EXISTS idx_story_scores_score_type ON story_scores (score_type);